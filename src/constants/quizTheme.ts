import React from 'react';
import { Triangle, Diamond, Circle, Square, CheckCircle, XCircle } from '@phosphor-icons/react';

export interface OptionTheme {
  id: number;
  letter: string;
  label: string;
  colorName: string;
  bgClass: string;
  hoverClass: string;
  barClass: string;
  textClass: string;
  ringClass: string;
  borderClass: string;
  icon: React.ComponentType<{ size?: number | string; weight?: any; className?: string }>;
}

export const MULTIPLE_CHOICE_THEMES: OptionTheme[] = [
  {
    id: 0,
    letter: 'A',
    label: 'Opção A',
    colorName: 'rose',
    bgClass: 'bg-rose-600',
    hoverClass: 'hover:bg-rose-500',
    barClass: 'bg-rose-500',
    textClass: 'text-rose-400',
    ringClass: 'ring-rose-500/50',
    borderClass: 'border-rose-500/60',
    icon: Triangle,
  },
  {
    id: 1,
    letter: 'B',
    label: 'Opção B',
    colorName: 'sky',
    bgClass: 'bg-sky-600',
    hoverClass: 'hover:bg-sky-500',
    barClass: 'bg-sky-500',
    textClass: 'text-sky-400',
    ringClass: 'ring-sky-500/50',
    borderClass: 'border-sky-500/60',
    icon: Diamond,
  },
  {
    id: 2,
    letter: 'C',
    label: 'Opção C',
    colorName: 'amber',
    bgClass: 'bg-amber-600',
    hoverClass: 'hover:bg-amber-500',
    barClass: 'bg-amber-500',
    textClass: 'text-amber-400',
    ringClass: 'ring-amber-500/50',
    borderClass: 'border-amber-500/60',
    icon: Circle,
  },
  {
    id: 3,
    letter: 'D',
    label: 'Opção D',
    colorName: 'emerald',
    bgClass: 'bg-emerald-600',
    hoverClass: 'hover:bg-emerald-500',
    barClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
    ringClass: 'ring-emerald-500/50',
    borderClass: 'border-emerald-500/60',
    icon: Square,
  },
];

export const BOOLEAN_THEMES = {
  Verdadeiro: {
    label: 'Verdadeiro',
    shortLabel: 'V',
    bgClass: 'bg-sky-600',
    hoverClass: 'hover:bg-sky-500',
    barClass: 'bg-sky-500',
    textClass: 'text-sky-400',
    borderClass: 'border-sky-500',
    badgeClass: 'bg-sky-500/20 text-sky-400',
    icon: CheckCircle,
  },
  Falso: {
    label: 'Falso',
    shortLabel: 'F',
    bgClass: 'bg-rose-600',
    hoverClass: 'hover:bg-rose-500',
    barClass: 'bg-rose-500',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500',
    badgeClass: 'bg-rose-500/20 text-rose-400',
    icon: XCircle,
  },
};
