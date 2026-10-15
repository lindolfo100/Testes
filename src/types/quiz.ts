export type QuestionType = 'boolean' | 'multiple';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[]; // ['Verdadeiro', 'Falso'] or ['Opção A', 'Opção B', 'Opção C', 'Opção D']
  correctAnswer: string;
  timeLimit: number; // seconds (e.g., 20)
  points: number; // e.g., 1000
  explanation?: string;
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
  status: SessionStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  isAcceptingAnswers: boolean;
  questionStartedAt?: number;
  timeLimitSeconds?: number;
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
  answer: string;
  isCorrect: boolean;
  pointsAwarded: number;
  timeSpentMs: number;
  submittedAt: string;
}
