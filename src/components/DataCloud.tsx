import React, { useMemo } from 'react';
import { Answer, Question } from '../types/quiz';
import { QUESTION_TYPES_META } from '../lib/quizHelpers';
import {
  Lightning,
  ClockCountdown,
  CheckCircle,
  Users,
  ChartBar,
} from '@phosphor-icons/react';

interface DataCloudProps {
  question: Question;
  answers: Answer[];
  totalPlayers: number;
}

export const DataCloud: React.FC<DataCloudProps> = ({ question, answers, totalPlayers }) => {
  const isOpinion = QUESTION_TYPES_META[question.type]?.isOpinion;

  const analytics = useMemo(() => {
    const totalAnswers = answers.length;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const accuracyPct = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
    const participationPct =
      totalPlayers > 0 ? Math.min(100, Math.round((totalAnswers / totalPlayers) * 100)) : 0;

    const times = answers.map((a) => a.timeSpentMs).filter((t) => t > 0);
    const avgTimeMs = times.length > 0 ? times.reduce((acc, cur) => acc + cur, 0) / times.length : 0;
    const avgTimeSec = (avgTimeMs / 1000).toFixed(1);

    const eligibleForFastest = isOpinion ? answers : answers.filter((a) => a.isCorrect);
    const fastestAnswer = eligibleForFastest.reduce<Answer | null>((min, cur) => {
      if (!min) return cur;
      return cur.timeSpentMs < min.timeSpentMs ? cur : min;
    }, null);

    return {
      totalAnswers,
      correctAnswers,
      accuracyPct,
      participationPct,
      avgTimeSec,
      fastestAnswer,
    };
  }, [answers, question, totalPlayers, isOpinion]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono uppercase tracking-wider mb-1">
            <Users size={14} weight="regular" />
            <span>Participação</span>
          </div>
          <div className="text-lg font-bold text-zinc-100 font-mono tabular-nums">
            {analytics.totalAnswers}/{totalPlayers}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            {analytics.participationPct}% da turma
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono uppercase tracking-wider mb-1">
            {isOpinion ? (
              <>
                <ChartBar size={14} weight="regular" />
                <span>Modalidade</span>
              </>
            ) : (
              <>
                <CheckCircle size={14} weight="regular" />
                <span>Taxa de Acerto</span>
              </>
            )}
          </div>
          {isOpinion ? (
            <>
              <div className="text-sm font-bold text-zinc-100 pt-0.5">Opinião Livre</div>
              <span className="text-[11px] text-zinc-400 font-mono">Sem gabarito fixo</span>
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-zinc-100 font-mono tabular-nums">
                {analytics.accuracyPct}%
              </div>
              <span className="text-[11px] text-emerald-400 font-mono">
                {analytics.correctAnswers} {analytics.correctAnswers === 1 ? 'acerto' : 'acertos'}
              </span>
            </>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono uppercase tracking-wider mb-1">
            <ClockCountdown size={14} weight="regular" />
            <span>Tempo Médio</span>
          </div>
          <div className="text-lg font-bold text-zinc-100 font-mono tabular-nums">
            {analytics.avgTimeSec}s
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">por envio</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono uppercase tracking-wider mb-1">
            <Lightning size={14} weight="fill" className="text-amber-400" />
            <span>Mais Rápido</span>
          </div>
          <div
            className="text-sm font-bold text-zinc-100 truncate"
            title={analytics.fastestAnswer?.playerNickname || '-'}
          >
            {analytics.fastestAnswer?.playerNickname || '—'}
          </div>
          <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
            {analytics.fastestAnswer
              ? `${((analytics.fastestAnswer.timeSpentMs || 0) / 1000).toFixed(2)}s`
              : 'Sem registro'}
          </span>
        </div>
      </div>
    </div>
  );
};
