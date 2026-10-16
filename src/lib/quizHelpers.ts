import React from 'react';
import { Question, QuestionType } from '../types/quiz';
import {
  ListNumbers,
  CheckCircle,
  ChatText,
  ArrowsLeftRight,
  SortAscending,
  Image,
  Video,
  Cloud,
  ChartPieSlice,
  Article,
} from '@phosphor-icons/react';

export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts YouTube video ID and returns an embeddable URL if valid
 */
export function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[1] && match[1].length === 11) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

/**
 * Shuffles an array and ensures it is not in the exact original order (when length > 1)
 */
export function shuffleItems<T>(items: T[]): T[] {
  if (items.length <= 1) return [...items];
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  const isSame = copy.every((val, idx) => val === items[idx]);
  if (isSame) {
    [copy[0], copy[copy.length - 1]] = [copy[copy.length - 1], copy[0]];
  }
  return copy;
}

/**
 * Validates student answer correctness according to the question format
 */
export function checkAnswerCorrectness(question: Question, answer: any): boolean {
  if (!answer) return false;

  switch (question.type) {
    case 'multiple':
    case 'boolean':
    case 'image':
      return normalizeText(String(answer)) === normalizeText(question.correctAnswer || '');

    case 'short_answer': {
      const normalizedInput = normalizeText(String(answer));
      const primaryMatch = normalizedInput === normalizeText(question.correctAnswer || '');
      if (primaryMatch) return true;
      if (question.acceptedAnswers && question.acceptedAnswers.length > 0) {
        return question.acceptedAnswers.some((acc) => normalizeText(acc) === normalizedInput);
      }
      return false;
    }

    case 'matching': {
      // answer is Record<pairId, selectedRightValue>
      if (!question.pairs || typeof answer !== 'object') return false;
      return question.pairs.every((pair) => answer[pair.id] === pair.right);
    }

    case 'ordering': {
      // answer is array of items in user order
      if (!question.itemsOrder || !Array.isArray(answer)) return false;
      if (answer.length !== question.itemsOrder.length) return false;
      return answer.every((val, idx) => val === question.itemsOrder![idx]);
    }

    case 'media':
      return normalizeText(String(answer)) === normalizeText(question.correctAnswer || '');

    case 'poll':
    case 'word_cloud':
    case 'open_ended':
      // Formatos de opinião, participação ou avaliação discursiva
      return true;

    default:
      return false;
  }
}

export interface QuestionTypeMeta {
  type: QuestionType;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ size?: number | string; weight?: any; className?: string }>;
  isOpinion?: boolean; // Sem resposta certa/errada
}

export const QUESTION_TYPES_META: Record<QuestionType, QuestionTypeMeta> = {
  multiple: {
    type: 'multiple',
    label: 'Múltipla Escolha',
    shortLabel: 'Múltipla',
    description: 'Escolha de uma alternativa entre as opções listadas.',
    icon: ListNumbers,
  },
  boolean: {
    type: 'boolean',
    label: 'Verdadeiro ou Falso',
    shortLabel: 'V / F',
    description: 'Julgamento se uma afirmação é correta ou incorreta.',
    icon: CheckCircle,
  },
  short_answer: {
    type: 'short_answer',
    label: 'Resposta Curta',
    shortLabel: 'Texto Curto',
    description: 'Digitação de palavra ou termo com conferência automática.',
    icon: ChatText,
  },
  matching: {
    type: 'matching',
    label: 'Associação de Pares',
    shortLabel: 'Pares',
    description: 'Relacionar conceitos correspondentes entre duas colunas.',
    icon: ArrowsLeftRight,
  },
  ordering: {
    type: 'ordering',
    label: 'Ordenação / Sequência',
    shortLabel: 'Ordem',
    description: 'Organizar itens em sequência cronológica ou lógica.',
    icon: SortAscending,
  },
  image: {
    type: 'image',
    label: 'Pergunta com Imagem',
    shortLabel: 'Imagem',
    description: 'Ilustração, mapa ou gráfico como estímulo para a pergunta.',
    icon: Image,
  },
  media: {
    type: 'media',
    label: 'Vídeo ou Áudio',
    shortLabel: 'Mídia',
    description: 'Áudio ou vídeo reproduzido antes do envio da resposta.',
    icon: Video,
  },
  word_cloud: {
    type: 'word_cloud',
    label: 'Nuvem de Palavras',
    shortLabel: 'Nuvem',
    description: 'Envio de palavras agrupadas por frequência ao vivo.',
    icon: Cloud,
    isOpinion: true,
  },
  poll: {
    type: 'poll',
    label: 'Enquete / Opinião',
    shortLabel: 'Enquete',
    description: 'Votação e levantamento de preferências sem certo/errado.',
    icon: ChartPieSlice,
    isOpinion: true,
  },
  open_ended: {
    type: 'open_ended',
    label: 'Resposta Discursiva',
    shortLabel: 'Discursiva',
    description: 'Texto dissertativo para análise e justificativa da ideia.',
    icon: Article,
    isOpinion: true,
  },
};
