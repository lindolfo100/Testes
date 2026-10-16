import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Player, QuizReport } from '../types/quiz';
import { exportReportToCSV } from '../services/reportService';
import { soundEffects } from '../lib/soundEffects';
import {
  Trophy,
  Medal,
  MedalMilitary,
  Flame,
  ArrowCounterClockwise,
  DownloadSimple,
  Crown,
  ChartBar,
  X,
  CheckCircle,
} from '@phosphor-icons/react';

interface PodiumProps {
  players: Player[];
  quizTitle: string;
  totalQuestions: number;
  report?: QuizReport | null;
  onRestart: () => void;
  onExit: () => void;
}

export const Podium: React.FC<PodiumProps> = ({
  players,
  quizTitle,
  totalQuestions,
  report,
  onRestart,
  onExit,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    // Play celebratory Web Audio fanfare
    soundEffects.playFanfare();

    const duration = 2.8 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#ffffff', '#fbbf24', '#f59e0b', '#38bdf8', '#34d399'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#ffffff', '#fbbf24', '#f59e0b', '#38bdf8', '#34d399'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const first = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];
  const rest = sortedPlayers.slice(3);

  const handleExportCSV = () => {
    if (report) {
      exportReportToCSV(report);
      return;
    }
    const headers = ['Posição,Nome do Aluno,Pontuação Total,Acertos Consecutivos (Streak)\n'];
    const rows = sortedPlayers.map(
      (p, i) => `${i + 1},"${p.nickname}",${p.score},${p.streak}\n`
    );
    const blob = new Blob([headers.concat(rows).join('')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `resultado_${quizTitle.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 py-6 px-4">
      {/* Title */}
      <div className="text-center space-y-1">
        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest block font-semibold">
          Pódio Final da Turma
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">{quizTitle}</h2>
        <div className="flex items-center justify-center gap-3 text-xs text-zinc-400 font-mono">
          <span>{totalQuestions} questões</span>
          <span>·</span>
          <span>{players.length} participantes</span>
          {report && (
            <>
              <span>·</span>
              <span className="text-emerald-400 font-semibold">{report.averageAccuracy}% acerto geral</span>
            </>
          )}
        </div>
      </div>

      {/* Sleek Minimalist Podium */}
      <div className="flex items-end justify-center gap-3 pt-6 pb-2">
        {/* 2nd Place */}
        {second && (
          <div className="flex flex-col items-center flex-1 max-w-[130px]">
            <div className="text-center mb-2">
              <span className="text-xs font-semibold text-zinc-300 block truncate max-w-[110px]">
                {second.nickname}
              </span>
              <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                {second.score} pts
              </span>
            </div>
            <div className="w-full h-28 bg-zinc-850 border border-zinc-750 rounded-t-2xl flex flex-col items-center justify-center space-y-1 shadow-sm">
              <span className="text-xs font-mono font-bold text-zinc-400">2</span>
              <Medal size={22} weight="fill" className="text-zinc-400" />
            </div>
          </div>
        )}

        {/* 1st Place */}
        {first && (
          <div className="flex flex-col items-center flex-1 max-w-[150px] -mt-6">
            <div className="text-center mb-2">
              <Crown size={22} weight="fill" className="text-amber-400 mx-auto mb-0.5" />
              <span className="text-sm font-bold text-zinc-100 block truncate max-w-[130px]">
                {first.nickname}
              </span>
              <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
                {first.score} pts
              </span>
            </div>
            <div className="w-full h-40 bg-zinc-800 border border-zinc-700 rounded-t-2xl flex flex-col items-center justify-center space-y-1 shadow-sm">
              <span className="text-sm font-mono font-bold text-zinc-200">1</span>
              <Trophy size={28} weight="fill" className="text-zinc-100" />
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div className="flex flex-col items-center flex-1 max-w-[130px]">
            <div className="text-center mb-2">
              <span className="text-xs font-semibold text-zinc-300 block truncate max-w-[110px]">
                {third.nickname}
              </span>
              <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                {third.score} pts
              </span>
            </div>
            <div className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded-t-2xl flex flex-col items-center justify-center space-y-1 shadow-sm">
              <span className="text-xs font-mono font-bold text-zinc-400">3</span>
              <MedalMilitary size={20} weight="fill" className="text-zinc-400" />
            </div>
          </div>
        )}
      </div>

      {/* Demais Participantes */}
      {rest.length > 0 && (
        <div className="space-y-1.5 pt-2 max-h-48 overflow-y-auto pr-1">
          {rest.map((p, idx) => (
            <div
              key={p.id}
              className="py-2 px-3 rounded-xl bg-zinc-900/40 border border-zinc-800/50 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-5 text-zinc-400 font-mono text-[11px]">#{idx + 4}</span>
                <span className="text-zinc-200 font-medium">{p.nickname}</span>
              </div>
              <div className="flex items-center gap-2">
                {p.streak > 1 && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-mono">
                    <Flame size={12} weight="fill" /> {p.streak}x
                  </span>
                )}
                <span className="font-mono text-zinc-300 font-semibold tabular-nums">{p.score} pts</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
        {report && report.questionsSummary.length > 0 && (
          <button
            type="button"
            onClick={() => setShowBreakdown(true)}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-200 text-xs font-medium border border-zinc-800 transition-colors flex items-center gap-1.5"
          >
            <ChartBar size={14} weight="bold" />
            <span>Ver Diagnóstico da Turma</span>
          </button>
        )}

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs font-medium border border-zinc-800 transition-colors flex items-center gap-1.5"
          title="Baixar planilha CSV com o resultado de todos os alunos"
        >
          <DownloadSimple size={14} weight="bold" />
          <span>Exportar Relatório CSV</span>
        </button>

        <button
          onClick={onRestart}
          className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
        >
          <ArrowCounterClockwise size={14} weight="bold" />
          <span>Reiniciar Sala</span>
        </button>

        <button
          onClick={onExit}
          className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs font-medium border border-zinc-800 transition-colors"
        >
          Concluir e Sair
        </button>
      </div>

      {/* Modal: Detailed Question Performance Breakdown */}
      {showBreakdown && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-zinc-100 text-sm">Diagnóstico da Turma por Questão</h3>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Média de Acertos: {report.averageAccuracy}% · {report.totalPlayers} Alunos
                </span>
              </div>
              <button
                onClick={() => setShowBreakdown(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {report.questionsSummary.map((q) => (
                <div
                  key={q.questionIndex}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                    <span className="font-mono font-bold text-zinc-300">
                      Questão #{q.questionIndex + 1}
                    </span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                        q.accuracyPercentage >= 70
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : q.accuracyPercentage >= 40
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {q.accuracyPercentage}% de acerto
                    </span>
                  </div>

                  <p className="text-zinc-100 font-medium leading-snug">{q.questionText}</p>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 pt-1">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle size={13} weight="fill" />
                      {q.correctAnswers} acertos
                    </span>
                    <span>·</span>
                    <span>{q.totalAnswers} respostas computadas</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleExportCSV}
                className="text-xs text-zinc-300 hover:text-white flex items-center gap-1.5"
              >
                <DownloadSimple size={13} weight="bold" />
                <span>Exportar CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBreakdown(false)}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
