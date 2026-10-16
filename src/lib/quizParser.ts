import { Question, QuestionType } from '../types/quiz';

export interface ParsedQuizData {
  title: string;
  subject: string;
  description: string;
  questions: Question[];
}

/**
 * Robust client-and-server shared heuristic text parser for educational questions.
 * Handles numbered lists (1., 1), Pergunta 1:), answers (R:, Resposta:, Gabarito:),
 * and paragraph splits with zero external dependencies.
 */
export function parseEducationalTextToQuestions(
  rawText: string,
  questionType: 'mixed' | 'boolean' | 'multiple' = 'mixed',
  defaultTimeLimit: number = 20
): ParsedQuizData {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const questions: Question[] = [];
  let currentQ: Partial<Question> | null = null;

  for (const line of lines) {
    // Detect question header (e.g., "1. ", "1)", "1 - ", "Pergunta 1:", "Q1:")
    const qMatch = line.match(/^(\d+[\.\-\)]|pergunta\s*\d+:?|q\d+:?)\s*(.*)/i);
    // Detect answer indicator (e.g., "R:", "Resposta:", "Gabarito:", "Correta:")
    const ansMatch = line.match(/^(r:|resposta:|gabarito:|correta:)\s*(.*)/i);

    if (qMatch) {
      if (currentQ && currentQ.question) {
        questions.push(finalizeQuestion(currentQ, questions.length, defaultTimeLimit));
      }

      const qText = qMatch[2] || line;
      const isBool = questionType === 'boolean' || (questionType === 'mixed' && questions.length % 2 === 0);

      currentQ = {
        id: 'q_parsed_' + Date.now().toString(36) + '_' + questions.length,
        type: isBool ? 'boolean' : 'multiple',
        question: qText,
        options: isBool ? ['Verdadeiro', 'Falso'] : ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
        correctAnswer: isBool ? 'Verdadeiro' : 'Opção A',
        timeLimit: defaultTimeLimit,
        points: 1000,
        explanation: 'Questão organizada a partir do material didático.',
      };
    } else if (ansMatch && currentQ) {
      const ansVal = ansMatch[2].trim();
      if (currentQ.type === 'boolean') {
        currentQ.correctAnswer = ansVal.toLowerCase().includes('fals') ? 'Falso' : 'Verdadeiro';
      } else {
        currentQ.correctAnswer = ansVal;
        if (currentQ.options && !currentQ.options.includes(ansVal)) {
          currentQ.options[0] = ansVal;
        }
      }
      currentQ.explanation = `Resposta confirmada pelo material: ${ansVal}`;
    } else if (currentQ && !currentQ.question?.includes('?')) {
      currentQ.question = (currentQ.question || '') + ' ' + line;
    }
  }

  if (currentQ && currentQ.question) {
    questions.push(finalizeQuestion(currentQ, questions.length, defaultTimeLimit));
  }

  // Fallback: If no structured numbering was found, break down meaningful paragraphs
  if (questions.length === 0) {
    const paragraphs = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 10);
    paragraphs.forEach((p, idx) => {
      const isBool = questionType === 'boolean' || (questionType === 'mixed' && idx % 2 === 0);
      questions.push({
        id: 'q_parsed_' + Date.now().toString(36) + '_' + idx,
        type: isBool ? 'boolean' : 'multiple',
        question: p.trim(),
        options: isBool ? ['Verdadeiro', 'Falso'] : ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
        correctAnswer: isBool ? 'Verdadeiro' : 'Opção A',
        timeLimit: defaultTimeLimit,
        points: 1000,
        explanation: 'Questão estruturada a partir do texto base.',
      });
    });
  }

  return {
    title: 'Questionário Organizado',
    subject: 'Geral',
    description: 'Questões extraídas com fidelidade a partir do conteúdo informado.',
    questions,
  };
}

function finalizeQuestion(q: Partial<Question>, index: number, defaultTimeLimit: number): Question {
  const isBool = q.type === 'boolean';
  return {
    id: q.id || `q_${Date.now()}_${index}`,
    type: (q.type as QuestionType) || 'boolean',
    question: q.question || '',
    options: q.options || (isBool ? ['Verdadeiro', 'Falso'] : ['Opção A', 'Opção B', 'Opção C', 'Opção D']),
    correctAnswer: q.correctAnswer || (isBool ? 'Verdadeiro' : 'Opção A'),
    timeLimit: q.timeLimit || defaultTimeLimit,
    points: q.points || 1000,
    explanation: q.explanation || '',
  };
}
