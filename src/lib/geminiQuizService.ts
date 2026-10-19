import { GoogleGenAI, Type } from '@google/genai';
import { parseEducationalTextToQuestions, ParsedQuizData } from './quizParser';
import { QuestionType } from '../types/quiz';

export type AiGenerationFormat =
  | 'mixed'
  | 'multiple'
  | 'boolean'
  | 'short_answer'
  | 'matching'
  | 'ordering'
  | 'poll'
  | 'open_ended';

export interface GenerateQuizInput {
  mode: 'paste' | 'topic';
  text: string;
  questionType?: AiGenerationFormat;
  count?: number;
  defaultTimeLimit?: number;
}

export interface GenerateQuizResult {
  status: number;
  data?: ParsedQuizData;
  error?: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'valendo-live',
      },
    },
  });
}

function getFormatPromptInstruction(questionType: AiGenerationFormat): string {
  switch (questionType) {
    case 'boolean':
      return "APENAS perguntas de 'Verdadeiro ou Falso' (type: 'boolean', options: ['Verdadeiro', 'Falso'], correctAnswer: 'Verdadeiro' ou 'Falso').";
    case 'multiple':
      return "APENAS perguntas de 'Múltipla Escolha' (type: 'multiple', 4 opções em options, correctAnswer idêntico à opção correta).";
    case 'short_answer':
      return "APENAS perguntas de 'Resposta Curta' (type: 'short_answer', correctAnswer com o termo principal esperado e acceptedAnswers com variações/sinônimos).";
    case 'matching':
      return "APENAS perguntas de 'Associação de Pares' (type: 'matching', com array pairs contendo de 3 a 4 objetos { id, left, right }).";
    case 'ordering':
      return "APENAS perguntas de 'Ordenação/Sequência' (type: 'ordering', com array itemsOrder contendo de 3 a 4 itens na sequência correta).";
    case 'poll':
      return "APENAS 'Enquetes de Opinião' sem resposta certa/errada (type: 'poll', 4 opções em options, points: 0).";
    case 'open_ended':
      return "APENAS perguntas 'Discursivas / Abertas' para reflexão (type: 'open_ended', points: 0).";
    case 'mixed':
    default:
      return "Uma combinação variada e dinâmica de formatos pedagógicos: Múltipla Escolha ('multiple'), Verdadeiro ou Falso ('boolean'), Resposta Curta ('short_answer'), Associação de Pares ('matching') e Ordenação ('ordering').";
  }
}

export async function generateOrParseQuiz(input: GenerateQuizInput): Promise<GenerateQuizResult> {
  const {
    mode,
    text,
    questionType = 'mixed',
    count = 5,
    defaultTimeLimit = 20,
  } = input;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return { status: 400, error: 'O texto ou tema deve ser fornecido.' };
  }

  const ai = getGeminiClient();

  if (!ai) {
    if (mode === 'paste') {
      const parsed = parseEducationalTextToQuestions(text, questionType as any, defaultTimeLimit);
      return { status: 200, data: parsed };
    }
    return {
      status: 400,
      error:
        'Para gerar questionários automáticos por tema com a IA Gemini, configure a variável GEMINI_API_KEY no ambiente. Se preferir, use a aba "Colar Questões" que funciona 100% offline!',
    };
  }

  const formatDescription = getFormatPromptInstruction(questionType);

  const prompt =
    mode === 'paste'
      ? `O professor colou o seguinte material/anotação com perguntas e respostas para uma atividade interativa em sala:\n\n"""\n${text.trim()}\n"""\n\nInstrução: Organize e monte as perguntas a partir desse conteúdo com total fidelidade aos fatos e gabaritos fornecidos. Formato desejado: ${formatDescription}. Quantidade sugerida: ${count} questões. Tempo padrão: ${defaultTimeLimit} segundos.`
      : `O professor solicitou a criação de uma atividade interativa sobre o tema:\n\n"""\n${text.trim()}\n"""\n\nInstrução: Crie ${count} questões didáticas, claras e engajadoras. Formato desejado: ${formatDescription}. Tempo padrão: ${defaultTimeLimit} segundos por questão.`;

  const config = {
    systemInstruction: `Você é um assistente pedagógico especialista na plataforma brasileira "Valendo!".
Siga rigorosamente:
1. Respeite com fidelidade os fatos e gabaritos fornecidos pelo professor.
2. Cada questão pode ter um dos seguintes valores em "type":
   - 'multiple': requer "options" (4 alternativas) e "correctAnswer" (texto idêntico a uma das alternativas).
   - 'boolean': requer "options": ['Verdadeiro', 'Falso'] e "correctAnswer": 'Verdadeiro' ou 'Falso'.
   - 'short_answer': requer "correctAnswer" (termo principal curto) e "acceptedAnswers" (lista de sinônimos aceitos).
   - 'matching': requer "pairs" (lista de 3 a 4 pares { id: 'p1', left: 'Conceito', right: 'Definição' }).
   - 'ordering': requer "itemsOrder" (lista de 3 a 4 strings na ordem correta exata).
   - 'poll': requer "options" (3 a 4 alternativas de opinião), points: 0.
   - 'open_ended': pergunta discursiva reflexiva, points: 0.
3. Inclua sempre uma "explanation" didática concisa (1 a 2 frases) para projetar no telão após a rodada.
4. Responda exclusivamente em Português do Brasil.`,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Título recomendado para o questionário' },
        subject: { type: Type.STRING, description: 'Disciplina ou área do conhecimento' },
        description: { type: Type.STRING, description: 'Resumo curto da atividade' },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: "'multiple' | 'boolean' | 'short_answer' | 'matching' | 'ordering' | 'poll' | 'open_ended'",
              },
              question: { type: Type.STRING, description: 'Enunciado da questão' },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Alternativas (para multiple, boolean ou poll)',
              },
              correctAnswer: { type: Type.STRING, description: 'Gabarito oficial (para multiple, boolean ou short_answer)' },
              acceptedAnswers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Sinônimos aceitos para short_answer',
              },
              pairs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    left: { type: Type.STRING },
                    right: { type: Type.STRING },
                  },
                  required: ['id', 'left', 'right'],
                },
                description: 'Pares para formato matching',
              },
              itemsOrder: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Itens na ordem correta para formato ordering',
              },
              timeLimit: { type: Type.INTEGER, description: 'Tempo em segundos' },
              points: { type: Type.INTEGER, description: 'Pontuação (1000 ou 0 para opinativas)' },
              explanation: { type: Type.STRING, description: 'Explicação pedagógica' },
            },
            required: ['type', 'question', 'timeLimit', 'points', 'explanation'],
          },
        },
      },
      required: ['title', 'subject', 'questions'],
    },
  };

  const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
  let parsed: any = null;
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      const rawJson = response.text?.trim() || '{}';
      parsed = JSON.parse(rawJson);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        break;
      }
    } catch (err: any) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    if (mode === 'paste') {
      const fallback = parseEducationalTextToQuestions(text, questionType as any, defaultTimeLimit);
      return { status: 200, data: fallback };
    }
    const is503 =
      lastError?.status === 503 ||
      String(lastError?.message).includes('high demand') ||
      String(lastError?.message).includes('503');
    const errorMessage = is503
      ? 'A IA Gemini está temporariamente com alta demanda. Aguarde alguns segundos e tente novamente.'
      : lastError?.message || 'Falha ao processar perguntas com a IA. Tente novamente em instantes.';
    return { status: 503, error: errorMessage };
  }

  // Sanitize and normalize questions
  const validTypes: QuestionType[] = [
    'multiple',
    'boolean',
    'short_answer',
    'matching',
    'ordering',
    'poll',
    'open_ended',
  ];

  parsed.questions = parsed.questions.map((q: any, idx: number) => {
    const qType: QuestionType = validTypes.includes(q.type) ? q.type : 'multiple';
    const isOpinion = ['poll', 'word_cloud', 'open_ended'].includes(qType);

    return {
      ...q,
      id: 'q_ai_' + Date.now().toString(36) + '_' + idx + '_' + Math.random().toString(36).substring(2, 5),
      type: qType,
      points: isOpinion ? 0 : q.points || 1000,
      timeLimit: q.timeLimit || defaultTimeLimit,
      options:
        qType === 'boolean'
          ? ['Verdadeiro', 'Falso']
          : ['multiple', 'poll'].includes(qType)
          ? Array.isArray(q.options) && q.options.length >= 2
            ? q.options.slice(0, 4)
            : ['Opção A', 'Opção B', 'Opção C', 'Opção D']
          : undefined,
      correctAnswer:
        qType === 'boolean'
          ? String(q.correctAnswer || '').toLowerCase().includes('fals')
            ? 'Falso'
            : 'Verdadeiro'
          : q.correctAnswer,
      pairs:
        qType === 'matching' && Array.isArray(q.pairs)
          ? q.pairs.map((p: any, pIdx: number) => ({
              id: p.id || `p_${pIdx + 1}`,
              left: p.left || `Conceito ${pIdx + 1}`,
              right: p.right || `Definição ${pIdx + 1}`,
            }))
          : undefined,
      itemsOrder:
        qType === 'ordering' && Array.isArray(q.itemsOrder) ? q.itemsOrder : undefined,
    };
  });

  return { status: 200, data: parsed };
}
