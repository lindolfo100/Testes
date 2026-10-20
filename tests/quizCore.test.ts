import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeText,
  checkAnswerCorrectness,
  sanitizeQuestionsForPublicSession,
} from '../src/lib/quizHelpers';
import { parseEducationalTextToQuestions } from '../src/lib/quizParser';
import { generateOrParseQuiz } from '../src/lib/geminiQuizService';
import { Question } from '../src/types/quiz';

test('normalizeText removes accents, trims and normalizes case', () => {
  assert.equal(normalizeText('  Fotossíntese  Clorofilada '), 'fotossintese clorofilada');
  assert.equal(normalizeText('São Paulo'), 'sao paulo');
});

test('checkAnswerCorrectness validates multiple, boolean, short_answer, matching, ordering and opinion types', () => {
  const multipleQ: Question = {
    id: 'q1',
    type: 'multiple',
    question: 'Capital do Ceará?',
    options: ['Fortaleza', 'Recife', 'Salvador', 'Natal'],
    correctAnswer: 'Fortaleza',
    timeLimit: 20,
    points: 1000,
  };
  assert.equal(checkAnswerCorrectness(multipleQ, 'Fortaleza'), true);
  assert.equal(checkAnswerCorrectness(multipleQ, 'fortaleza '), true);
  assert.equal(checkAnswerCorrectness(multipleQ, 'Recife'), false);

  const shortQ: Question = {
    id: 'q2',
    type: 'short_answer',
    question: 'Processo realizado pelos cloroplastos?',
    correctAnswer: 'Fotossíntese',
    acceptedAnswers: ['fotossintese', 'síntese luminosa'],
    timeLimit: 25,
    points: 1000,
  };
  assert.equal(checkAnswerCorrectness(shortQ, 'FOTOSSINTESE'), true);
  assert.equal(checkAnswerCorrectness(shortQ, 'Síntese Luminosa'), true);
  assert.equal(checkAnswerCorrectness(shortQ, 'Respiração'), false);

  const matchingQ: Question = {
    id: 'q3',
    type: 'matching',
    question: 'Associe biomas:',
    pairs: [
      { id: 'p1', left: 'Caatinga', right: 'Semiárido' },
      { id: 'p2', left: 'Amazônia', right: 'Equatorial úmido' },
    ],
    timeLimit: 30,
    points: 1000,
  };
  assert.equal(
    checkAnswerCorrectness(matchingQ, { p1: 'Semiárido', p2: 'Equatorial úmido' }),
    true
  );
  assert.equal(
    checkAnswerCorrectness(matchingQ, { p1: 'Equatorial úmido', p2: 'Semiárido' }),
    false
  );

  const orderingQ: Question = {
    id: 'q4',
    type: 'ordering',
    question: 'Ordene cronologicamente:',
    itemsOrder: ['Colônia', 'Império', 'República'],
    timeLimit: 25,
    points: 1000,
  };
  assert.equal(checkAnswerCorrectness(orderingQ, ['Colônia', 'Império', 'República']), true);
  assert.equal(checkAnswerCorrectness(orderingQ, ['Império', 'Colônia', 'República']), false);

  const pollQ: Question = {
    id: 'q5',
    type: 'poll',
    question: 'Qual formato você prefere?',
    options: ['Quiz', 'Debate'],
    timeLimit: 20,
    points: 0,
  };
  assert.equal(checkAnswerCorrectness(pollQ, 'Quiz'), true);
});

test('sanitizeQuestionsForPublicSession strips answer keys and explanations from public session questions', () => {
  const fullQuestions: Question[] = [
    {
      id: 'q1',
      type: 'short_answer',
      question: 'Qual é o satélite natural da Terra?',
      correctAnswer: 'Lua',
      acceptedAnswers: ['a lua'],
      explanation: 'A Lua é o único satélite natural da Terra.',
      timeLimit: 20,
      points: 1000,
    },
    {
      id: 'q2',
      type: 'matching',
      question: 'Relacione:',
      pairs: [
        { id: 'p1', left: 'Brasil', right: 'Brasília' },
        { id: 'p2', left: 'Argentina', right: 'Buenos Aires' },
      ],
      explanation: 'Capitais da América do Sul.',
      timeLimit: 30,
      points: 1000,
    },
  ];

  const sanitized = sanitizeQuestionsForPublicSession(fullQuestions);

  assert.equal(sanitized[0].correctAnswer, undefined);
  assert.equal(sanitized[0].acceptedAnswers, undefined);
  assert.equal(sanitized[0].explanation, undefined);

  assert.equal(sanitized[1].explanation, undefined);
  assert.equal(sanitized[1].pairs?.[0].right, '');
  assert.equal(sanitized[1].pairs?.[1].right, '');
  assert.equal(sanitized[1].matchingOptions?.length, 2);
  assert.ok(sanitized[1].matchingOptions?.includes('Brasília'));
  assert.ok(sanitized[1].matchingOptions?.includes('Buenos Aires'));
});

test('parseEducationalTextToQuestions extracts numbered questions and answers offline', () => {
  const text = `
1. O Sol é uma estrela?
R: Verdadeiro

2. Qual é o maior planeta do Sistema Solar?
Gabarito: Júpiter
`;

  const parsed = parseEducationalTextToQuestions(text, 'mixed', 25);
  assert.equal(parsed.questions.length, 2);
  assert.equal(parsed.questions[0].correctAnswer, 'Verdadeiro');
  assert.equal(parsed.questions[0].timeLimit, 25);
  assert.equal(parsed.questions[1].correctAnswer, 'Júpiter');
});

test('generateOrParseQuiz enforces payload bounds and supports offline paste fallback', async () => {
  const emptyRes = await generateOrParseQuiz({ mode: 'paste', text: '   ' });
  assert.equal(emptyRes.status, 400);

  const oversizedRes = await generateOrParseQuiz({
    mode: 'paste',
    text: 'a'.repeat(15005),
  });
  assert.equal(oversizedRes.status, 400);

  const pasteRes = await generateOrParseQuiz({
    mode: 'paste',
    text: '1. A água ferve a 100 graus Celsius ao nível do mar?\nR: Verdadeiro',
    questionType: 'boolean',
    defaultTimeLimit: 15,
  });
  assert.equal(pasteRes.status, 200);
  assert.equal(pasteRes.data?.questions.length, 1);
  assert.equal(pasteRes.data?.questions[0].correctAnswer, 'Verdadeiro');
});

test('generateOrParseQuiz handles custom teacher API keys and offline fallback', async () => {
  // With custom API key provided, paste mode structures successfully via offline parser fallback
  const customKeyRes = await generateOrParseQuiz({
    mode: 'paste',
    text: '1. O Brasil foi descoberto em 1500.\nR: Verdadeiro\n2. Capital de Minas Gerais?\nR: Belo Horizonte',
    apiKey: 'AIzaSy_fake_test_key_for_teacher',
  });
  assert.equal(customKeyRes.status, 200);
  assert.equal(customKeyRes.data?.questions.length, 2);

  // With an invalid key on topic mode, it fails gracefully with a handled error response (never uncaught crash)
  const invalidKeyRes = await generateOrParseQuiz({
    mode: 'topic',
    text: 'Biomas brasileiros e cerrado',
    apiKey: 'invalid_key_testing_123',
  });
  assert.ok(invalidKeyRes.status >= 400);
  assert.ok(typeof invalidKeyRes.error === 'string');
});
