import React from 'react';
import { QuizReport } from '../types/quiz';
import { exportReportToCSV } from '../services/reportService';
import { X, DownloadSimple, CheckCircle } from '@phosphor-icons/react';

interface ReportDiagnosticsModalProps {
  report: QuizReport;
  onClose: () => void;
}

export const ReportDiagnosticsModal: React.FC<ReportDiagnosticsModalProps> = ({
  report,
  onClose,
}) => {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
      >
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-zinc-100 text-base">{report.quizTitle}</h3>
            <span className="text-xs text-zinc-300">
              <strong className="font-mono tabular-nums">{report.totalPlayers}</strong> alunos ·{' '}
              <strong className="font-mono tabular-nums">{report.totalQuestions}</strong> questões ·{' '}
              <strong className="font-mono tabular-nums text-emerald-400">{report.averageAccuracy}%</strong> precisão geral
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar diagnóstico da turma"
            className="min-w-[44px] min-h-[44px] p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Podium Ranking */}
          {report.playersRanking && report.playersRanking.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-zinc-300 font-medium block">
                Classificação da turma
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {report.playersRanking.map((p, idx) => (
                  <div
                    key={idx}
                    className="py-2 px-3 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 font-mono font-bold tabular-nums ${
                          idx === 0 ? 'text-amber-400' : 'text-zinc-300'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="text-zinc-100 font-medium">{p.nickname}</span>
                    </div>
                    <span className="text-zinc-200 font-mono font-bold tabular-nums">{p.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question By Question Accuracy */}
          <div className="space-y-2">
            <span className="text-xs text-zinc-300 font-medium block">
              Desempenho por questão
            </span>
            <div className="space-y-2.5">
              {report.questionsSummary.map((q) => (
                <div
                  key={q.questionIndex}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-300">
                      Questão <strong className="font-mono tabular-nums">#{q.questionIndex + 1}</strong>
                    </span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-xs tabular-nums ${
                        q.accuracyPercentage >= 70
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                          : q.accuracyPercentage >= 40
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {q.accuracyPercentage}% de acerto
                    </span>
                  </div>
                  <p className="text-zinc-100 font-medium leading-snug">{q.questionText}</p>
                  <div className="flex items-center gap-3 text-xs text-zinc-300 pt-0.5">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle size={13} weight="fill" />
                      <span>
                        <strong className="font-mono tabular-nums">{q.correctAnswers}</strong> acertos
                      </span>
                    </span>
                    <span>·</span>
                    <span>
                      <strong className="font-mono tabular-nums">{q.totalAnswers}</strong> respostas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => exportReportToCSV(report)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-750 transition-colors flex items-center gap-1.5"
          >
            <DownloadSimple size={14} weight="bold" />
            <span>Exportar Planilha CSV</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
