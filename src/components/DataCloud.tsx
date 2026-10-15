import React, { useMemo } from 'react';
import { Answer, Question } from '../types/quiz';
import { Cloud, Zap, Timer, Award, Activity } from 'lucide-react';

interface DataCloudProps {
  question: Question;
  answers: Answer[];
  totalPlayers: number;
}

interface CloudTerm {
  text: string;
  weight: number; // 1 to 5
  sentiment: 'correct' | 'incorrect' | 'neutral' | 'highlight';
  count: number;
}

export const DataCloud: React.FC<DataCloudProps> = ({ question, answers, totalPlayers }) => {
  const analytics = useMemo(() => {
    const totalAnswers = answers.length;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const accuracyPct = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

    const times = answers.map((a) => a.timeSpentMs).filter((t) => t > 0);
    const avgTimeMs = times.length > 0 ? times.reduce((acc, cur) => acc + cur, 0) / times.length : 0;
    const avgTimeSec = (avgTimeMs / 1000).toFixed(1);

    const fastestAnswer = answers.reduce<Answer | null>((min, cur) => {
      if (!min) return cur;
      return cur.timeSpentMs < min.timeSpentMs ? cur : min;
    }, null);

    // Build word and concept cloud terms
    const termMap: Record<string, { count: number; isCorrect: boolean }> = {};

    // 1. Group answers
    answers.forEach((ans) => {
      const cleanAnswer = ans.answer.trim();
      if (!termMap[cleanAnswer]) {
        termMap[cleanAnswer] = { count: 0, isCorrect: ans.isCorrect };
      }
      termMap[cleanAnswer].count += 1;
    });

    // 2. Extract key keywords from question context
    const questionTokens = question.question
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 4 && !['sobre', 'quando', 'onde', 'qual', 'quais', 'entre', 'como'].includes(w.toLowerCase()));

    const uniqueTokens = Array.from(new Set(questionTokens)).slice(0, 5);

    const terms: CloudTerm[] = [];

    // Answers as terms
    Object.entries(termMap).forEach(([text, data]) => {
      terms.push({
        text,
        weight: Math.min(5, Math.max(1, Math.ceil((data.count / Math.max(1, totalAnswers)) * 5))),
        sentiment: data.isCorrect ? 'correct' : 'incorrect',
        count: data.count,
      });
    });

    // Add question context concepts
    uniqueTokens.forEach((token, idx) => {
      terms.push({
        text: token,
        weight: 2 + (idx % 3),
        sentiment: 'neutral',
        count: totalAnswers,
      });
    });

    // Add general performance descriptors
    if (accuracyPct >= 80) {
      terms.push({ text: 'Domínio Conceitual', weight: 4, sentiment: 'highlight', count: correctAnswers });
      terms.push({ text: 'Alto Rendimento', weight: 3, sentiment: 'correct', count: correctAnswers });
    } else if (accuracyPct <= 40 && totalAnswers > 0) {
      terms.push({ text: 'Pegadinha / Dúvida', weight: 4, sentiment: 'incorrect', count: totalAnswers - correctAnswers });
      terms.push({ text: 'Ponto de Revisão', weight: 3, sentiment: 'highlight', count: totalAnswers });
    } else {
      terms.push({ text: 'Consenso Parcial', weight: 3, sentiment: 'highlight', count: totalAnswers });
    }

    return {
      totalAnswers,
      correctAnswers,
      accuracyPct,
      avgTimeSec,
      fastestAnswer,
      terms,
    };
  }, [answers, question]);

  const getTermStyle = (term: CloudTerm) => {
    const sizeClasses = [
      'text-xs py-1 px-2.5',
      'text-sm py-1.5 px-3',
      'text-base py-2 px-3.5 font-semibold',
      'text-lg py-2 px-4 font-bold',
      'text-xl sm:text-2xl py-2.5 px-5 font-extrabold',
    ][term.weight - 1];

    let colorClass = 'bg-slate-800 text-slate-300 border-slate-700';
    if (term.sentiment === 'correct') {
      colorClass = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 shadow-sm';
    } else if (term.sentiment === 'incorrect') {
      colorClass = 'bg-rose-950/50 text-rose-300 border-rose-500/40';
    } else if (term.sentiment === 'highlight') {
      colorClass = 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40';
    }

    return `${sizeClasses} ${colorClass}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-850 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
      {/* Cloud Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Nuvem de Dados da Turma</h3>
            <span className="text-xs text-slate-400">Padrões de resposta e dinâmica em tempo real</span>
          </div>
        </div>

        {/* Real-time Indicators */}
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>
              {analytics.totalAnswers}/{totalPlayers} votos
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Timer className="w-4 h-4 text-amber-400" />
            <span>Média: {analytics.avgTimeSec}s</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>{analytics.accuracyPct}% acertos</span>
          </div>
        </div>
      </div>

      {/* Cloud Word Canvas */}
      <div className="py-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 min-h-[140px]">
        {analytics.terms.map((term, i) => (
          <div
            key={i}
            className={`rounded-xl border transition-transform hover:scale-105 select-none flex items-center gap-2 ${getTermStyle(
              term
            )}`}
          >
            <span>{term.text}</span>
            <span className="text-[10px] opacity-75 font-mono tabular-nums bg-black/20 px-1.5 py-0.5 rounded">
              {term.count}
            </span>
          </div>
        ))}
      </div>

      {/* Footer Insight Box */}
      {analytics.fastestAnswer && (
        <div className="pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-amber-300 font-medium">
            <Zap className="w-3.5 h-3.5" />
            <span>
              Mais rápido: <strong>{analytics.fastestAnswer.playerNickname}</strong> em{' '}
              {((analytics.fastestAnswer.timeSpentMs || 0) / 1000).toFixed(2)}s
            </span>
          </div>

          <div className="text-slate-400">
            {question.explanation && (
              <span className="italic line-clamp-1">
                Conceito-chave: {question.explanation}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
