import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player } from '../types/quiz';
import { Trophy, Medal, Award, Flame, RotateCcw, Download } from 'lucide-react';

interface PodiumProps {
  players: Player[];
  quizTitle: string;
  totalQuestions: number;
  onRestart: () => void;
  onExit: () => void;
}

export const Podium: React.FC<PodiumProps> = ({
  players,
  quizTitle,
  totalQuestions,
  onRestart,
  onExit,
}) => {
  // Fire confetti on mount
  useEffect(() => {
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#38BDF8', '#F59E0B', '#10B981', '#EC4899', '#6366F1'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#38BDF8', '#F59E0B', '#10B981', '#EC4899', '#6366F1'],
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

  const exportCSV = () => {
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
    <div className="w-full max-w-4xl mx-auto space-y-10 py-6 px-4">
      {/* Title */}
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" /> Pódio da Turma
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">{quizTitle}</h2>
        <p className="text-sm text-slate-400">
          Quiz finalizado com {totalQuestions} perguntas · {players.length} estudantes participaram
        </p>
      </div>

      {/* 3D-style Podium Pillars */}
      <div className="flex items-end justify-center gap-3 sm:gap-6 pt-12 pb-4">
        {/* 2nd Place */}
        {second && (
          <div className="flex flex-col items-center flex-1 max-w-[180px]">
            <div className="relative mb-2 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-slate-300 text-slate-900 flex items-center justify-center font-bold text-lg shadow-lg border-2 border-white mb-1">
                2
              </div>
              <span className="font-bold text-white text-sm text-center truncate max-w-[140px]">
                {second.nickname}
              </span>
              <span className="text-xs text-slate-300 font-mono tabular-nums font-semibold">
                {second.score} pts
              </span>
            </div>
            <div className="w-full h-36 bg-gradient-to-t from-slate-700 to-slate-500 rounded-t-2xl shadow-xl flex items-center justify-center border-t-2 border-slate-300">
              <Medal className="w-8 h-8 text-slate-200" />
            </div>
          </div>
        )}

        {/* 1st Place */}
        {first && (
          <div className="flex flex-col items-center flex-1 max-w-[200px] -mt-6">
            <div className="relative mb-2 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 flex items-center justify-center font-extrabold text-2xl shadow-2xl border-4 border-amber-200 ring-4 ring-amber-400/30 mb-1 animate-bounce">
                👑
              </div>
              <span className="font-extrabold text-amber-300 text-base sm:text-lg text-center truncate max-w-[160px]">
                {first.nickname}
              </span>
              <span className="text-sm text-amber-200 font-mono tabular-nums font-bold">
                {first.score} pts
              </span>
            </div>
            <div className="w-full h-48 bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 rounded-t-2xl shadow-2xl flex items-center justify-center border-t-4 border-amber-200">
              <Trophy className="w-12 h-12 text-amber-950" />
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div className="flex flex-col items-center flex-1 max-w-[180px]">
            <div className="relative mb-2 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-amber-700 text-amber-100 flex items-center justify-center font-bold text-lg shadow-lg border-2 border-amber-500 mb-1">
                3
              </div>
              <span className="font-bold text-white text-sm text-center truncate max-w-[140px]">
                {third.nickname}
              </span>
              <span className="text-xs text-slate-300 font-mono tabular-nums font-semibold">
                {third.score} pts
              </span>
            </div>
            <div className="w-full h-28 bg-gradient-to-t from-amber-900 to-amber-700 rounded-t-2xl shadow-xl flex items-center justify-center border-t-2 border-amber-500">
              <Award className="w-7 h-7 text-amber-300" />
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Table for remaining students */}
      {rest.length > 0 && (
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 sm:p-6 space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Demais Participantes da Turma
          </h4>
          <div className="divide-y divide-slate-700/60 max-h-60 overflow-y-auto pr-2">
            {rest.map((p, idx) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-slate-400 font-mono text-xs font-semibold">
                    #{idx + 4}
                  </span>
                  <span className="font-medium text-slate-200">{p.nickname}</span>
                </div>
                <div className="flex items-center gap-4">
                  {p.streak > 1 && (
                    <span className="text-xs text-amber-400 flex items-center gap-1 font-mono">
                      <Flame className="w-3.5 h-3.5" /> {p.streak}x
                    </span>
                  )}
                  <span className="font-mono tabular-nums font-bold text-white">
                    {p.score} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        <button
          onClick={exportCSV}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-600 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Relatório (CSV)</span>
        </button>

        <button
          onClick={onRestart}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Nova Rodada com a Turma</span>
        </button>

        <button
          onClick={onExit}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
        >
          Voltar ao Painel
        </button>
      </div>
    </div>
  );
};
