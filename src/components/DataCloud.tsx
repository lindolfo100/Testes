import React, { useMemo } from 'react';
import { Answer, Question } from '../types/quiz';
import { QUESTION_TYPES_META } from '../lib/quizHelpers';
import { Lightning } from '@phosphor-icons/react';

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

    const times = answers.map((a) => a.timeSpentMs).filter((t) => t > 0);
    const avgTimeMs = times.length > 0 ? times.reduce((acc, cur) => acc + cur, 0) / times.length : 0;
    const avgTimeSec = (avgTimeMs / 1000).toFixed(1).replace('.', ',');

    const eligibleForFastest = isOpinion ? answers : answers.filter((a) => a.isCorrect);
    const fastestAnswer = eligibleForFastest.reduce<Answer | null>((min, cur) => {
      if (!min) return cur;
      return cur.timeSpentMs < min.timeSpentMs ? cur : min;
    }, null);

    return {
      totalAnswers,
      correctAnswers,
      accuracyPct,
      avgTimeSec,
      fastestAnswer,
    };
  }, [answers, question, isOpinion]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="py-3 px-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-zinc-300 text-center">
        <span>
          <strong className="font-mono text-zinc-100 tabular-nums">
            {analytics.totalAnswers}/{totalPlayers}
          </strong>{' '}
          responderam
        </span>

        <span className="text-zinc-600" aria-hidden="true">
          ·
        </span>

        {isOpinion ? (
          <span>Sondagem livre</span>
        ) : (
          <span>
            <strong className="font-mono text-emerald-400 tabular-nums">
              {analytics.accuracyPct}%
            </strong>{' '}
            acertos
          </span>
        )}

        <span className="text-zinc-600" aria-hidden="true">
          ·
        </span>

        <span>
          <strong className="font-mono text-zinc-100 tabular-nums">
            {analytics.avgTimeSec}s
          </strong>{' '}
          em média
        </span>

        {analytics.fastestAnswer && (
          <>
            <span className="text-zinc-600" aria-hidden="true">
              ·
            </span>
            <span className="inline-flex items-center gap-1">
              <Lightning size={14} weight="fill" className="text-amber-400 shrink-0" />
              <span>Mais rápido:</span>
              <strong className="text-zinc-100">{analytics.fastestAnswer.playerNickname}</strong>
              <span className="font-mono text-zinc-300 tabular-nums">
                ({((analytics.fastestAnswer.timeSpentMs || 0) / 1000).toFixed(1).replace('.', ',')}s)
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

