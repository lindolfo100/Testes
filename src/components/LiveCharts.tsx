import React from 'react';
import { Question, Answer } from '../types/quiz';
import { Check, X } from 'lucide-react';

interface LiveChartsProps {
  question: Question;
  answers: Answer[];
  showCorrect: boolean;
}

const OPTION_THEMES = [
  { bg: 'bg-rose-500', barBg: 'bg-rose-600', text: 'text-rose-400', symbol: '▲', label: 'Opção A' },
  { bg: 'bg-sky-500', barBg: 'bg-sky-600', text: 'text-sky-400', symbol: '◆', label: 'Opção B' },
  { bg: 'bg-amber-500', barBg: 'bg-amber-600', text: 'text-amber-400', symbol: '●', label: 'Opção C' },
  { bg: 'bg-emerald-500', barBg: 'bg-emerald-600', text: 'text-emerald-400', symbol: '■', label: 'Opção D' },
];

export const LiveCharts: React.FC<LiveChartsProps> = ({ question, answers, showCorrect }) => {
  const totalAnswers = answers.length;

  if (question.type === 'boolean') {
    // Count Verdadeiro vs Falso
    const countV = answers.filter((a) => a.answer === 'Verdadeiro').length;
    const countF = answers.filter((a) => a.answer === 'Falso').length;

    const pctV = totalAnswers > 0 ? Math.round((countV / totalAnswers) * 100) : 0;
    const pctF = totalAnswers > 0 ? Math.round((countF / totalAnswers) * 100) : 0;

    const isCorrectV = question.correctAnswer === 'Verdadeiro';
    const isCorrectF = question.correctAnswer === 'Falso';

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* VERDADEIRO */}
          <div
            className={`p-6 rounded-2xl border transition-all ${
              showCorrect && isCorrectV
                ? 'bg-sky-950/40 border-sky-500 ring-2 ring-sky-500/50 shadow-lg shadow-sky-500/10'
                : 'bg-slate-800/80 border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-lg">
                  V
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Verdadeiro</h4>
                  <span className="text-xs text-slate-400">Afirmação correta</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-white font-mono tabular-nums">{countV}</span>
                <span className="text-sm text-slate-400 ml-1">votos ({pctV}%)</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-5 overflow-hidden p-0.5 border border-slate-700">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2 text-[10px] font-bold text-white"
                style={{ width: `${Math.max(pctV, 4)}%` }}
              >
                {pctV > 12 && `${pctV}%`}
              </div>
            </div>

            {showCorrect && (
              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center gap-2">
                {isCorrectV ? (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-400" /> Resposta Correta
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <X className="w-4 h-4 text-slate-500" /> Incorreta
                  </span>
                )}
              </div>
            )}
          </div>

          {/* FALSO */}
          <div
            className={`p-6 rounded-2xl border transition-all ${
              showCorrect && isCorrectF
                ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/50 shadow-lg shadow-rose-500/10'
                : 'bg-slate-800/80 border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-lg">
                  F
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Falso</h4>
                  <span className="text-xs text-slate-400">Afirmação incorreta</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-white font-mono tabular-nums">{countF}</span>
                <span className="text-sm text-slate-400 ml-1">votos ({pctF}%)</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-5 overflow-hidden p-0.5 border border-slate-700">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2 text-[10px] font-bold text-white"
                style={{ width: `${Math.max(pctF, 4)}%` }}
              >
                {pctF > 12 && `${pctF}%`}
              </div>
            </div>

            {showCorrect && (
              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center gap-2">
                {isCorrectF ? (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-400" /> Resposta Correta
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <X className="w-4 h-4 text-slate-500" /> Incorreta
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MULTIPLE CHOICE
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {question.options.map((opt, idx) => {
          const count = answers.filter((a) => a.answer === opt).length;
          const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
          const isCorrect = question.correctAnswer === opt;
          const theme = OPTION_THEMES[idx % OPTION_THEMES.length];

          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl border transition-all ${
                showCorrect && isCorrect
                  ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-800/80 border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg ${theme.bg} text-white flex items-center justify-center font-bold text-sm shadow-sm`}
                  >
                    {theme.symbol}
                  </div>
                  <span className="font-semibold text-slate-200 text-sm sm:text-base leading-snug">
                    {opt}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-extrabold text-white font-mono tabular-nums">
                    {count}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">({pct}%)</span>
                </div>
              </div>

              {/* Bar */}
              <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden p-0.5 border border-slate-700">
                <div
                  className={`${theme.barBg} h-full rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
              </div>

              {showCorrect && (
                <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                  {isCorrect ? (
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Alternativa Correta
                    </span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Incorreta
                    </span>
                  )}
                  <span className="text-slate-400 font-mono tabular-nums">{count} alunos</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
