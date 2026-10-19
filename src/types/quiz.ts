export type QuestionType =
  | 'multiple'      // 1. Múltipla escolha
  | 'boolean'       // 2. Verdadeiro ou falso
  | 'short_answer'  // 3. Resposta curta ou campo de texto
  | 'matching'      // 4. Associação de pares
  | 'ordering'      // 5. Ordenação ou classificação
  | 'image'         // 6. Pergunta com imagem
  | 'media'         // 7. Pergunta baseada em vídeo ou áudio
  | 'word_cloud'    // 8. Nuvem de palavras
  | 'poll'          // 9. Enquete ou votação
  | 'open_ended';   // 10. Resposta aberta ou discursiva

export interface MatchingPair {
  id: string;
  left: string;   // Ex: "Amazônia"
  right: string;  // Ex: "Maior floresta tropical úmida"
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // Opções para múltipla escolha, enquete ou pergunta com imagem
  correctAnswer?: string; // Para boolean, multiple, short_answer, image, media
  timeLimit: number; // segundos (ex: 20)
  points: number; // ex: 1000 (enquete e nuvem de palavras podem ser 0 ou pontuação de participação)
  explanation?: string;

  // Campos complementares para os novos formatos:
  acceptedAnswers?: string[]; // Para 3. Resposta curta (ex: ['fotossíntese', 'fotossintese'])
  pairs?: MatchingPair[];     // Para 4. Associação de pares
  itemsOrder?: string[];      // Para 5. Ordenação (sequência correta dos itens)
  mediaUrl?: string;          // Para 6. Imagem e 7. Vídeo/Áudio
  mediaType?: 'image' | 'video' | 'audio';
  placeholder?: string;       // Dica de preenchimento para resposta curta/discursiva
}

export interface Quiz {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  subject: string;
  isPublic: boolean;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus =
  | 'lobby'
  | 'question'
  | 'result'
  | 'leaderboard'
  | 'podium'
  | 'finished';

export interface Session {
  id: string;
  pin: string;
  hostId: string;
  hostName?: string;
  quizId: string;
  quizTitle: string;
  questions?: Question[];
  status: SessionStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  isAcceptingAnswers: boolean;
  questionStartedAt?: number;
  timeLimitSeconds?: number;
  rankingSnapshot?: { id: string; nickname: string; score: number }[];
  createdAt: string;
}

export interface Player {
  id: string;
  sessionId: string;
  nickname: string;
  score: number;
  streak: number;
  joinedAt: string;
}

export interface Answer {
  id: string;
  sessionId: string;
  questionIndex: number;
  playerId: string;
  playerNickname: string;
  answer: any; // string, string[], ou Record<string, string> para pares
  isCorrect: boolean;
  pointsAwarded: number;
  timeSpentMs: number;
  submittedAt: string;
}

export interface QuestionReportSummary {
  questionIndex: number;
  questionText: string;
  questionType: QuestionType;
  totalAnswers: number;
  correctAnswers: number;
  accuracyPercentage: number;
}

export interface QuizReport {
  id: string;
  teacherId: string;
  sessionId: string;
  quizId: string;
  quizTitle: string;
  subject?: string;
  totalQuestions: number;
  totalPlayers: number;
  averageAccuracy: number; // 0 a 100
  top3: { nickname: string; score: number }[];
  playersRanking: { nickname: string; score: number; streak: number }[];
  questionsSummary: QuestionReportSummary[];
  completedAt: string;
}

