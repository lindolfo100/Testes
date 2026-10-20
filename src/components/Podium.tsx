import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Player, QuizReport } from '../types/quiz';
import { exportReportToCSV } from '../services/reportService';
import { soundEffects } from '../lib/soundEffects';
import { ReportDiagnosticsModal } from './ReportDiagnosticsModal';
import { PodiumCelebrationIllustration } from './BrandIllustrations';
import {
  Trophy,
  Medal,
  MedalMilitary,
  Flame,
  ArrowCounterClockwise,
  DownloadSimple,
  Crown,
  ChartBar,
  Play,
  SignOut,
} from '@phosphor-icons/react';

interface PodiumProps {
  players: Player[];
  quizTitle: string;
  totalQuestions: number;
  report?: QuizReport | null;
  onRestart: (startImmediately?: boolean) => void;
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
    soundEffects.playFanfare();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

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
    const targetReport: QuizReport = report || {
      id: 'sessao_atual',
      teacherId: 'guest',
      sessionId: 'sessao_atual',
      quizId: 'quiz_atual',
      quizTitle,
      totalQuestions,
      totalPlayers: players.length,
      averageAccuracy: 0,
      top3: sortedPlayers.slice(0, 3).map((p) => ({ nickname: p.nickname, score: p.score })),
      playersRanking: sortedPlayers.map((p) => ({
        nickname: p.nickname,
        score: p.score,
        streak: p.streak,
      })),
      questionsSummary: [],
      completedAt: new Date().toISOString(),
    };
    exportReportToCSV(targetReport);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 py-6 px-4">
      {/* Title with Celebration Illustration */}
      <div className="text-center space-y-1.5">
        <PodiumCelebrationIllustration className="w-28 h-24 mx-auto" />
        <span className="text-xs text-amber-300 font-medium block">
          Pódio final da turma
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-display">{quizTitle}</h2>
        <div className="flex items-center justify-center gap-2.5 text-xs text-zinc-300">
          <span>
            <strong className="font-mono text-zinc-100 tabular-nums">{totalQuestions}</strong> questões
          </span>
          <span>·</span>
          <span>
            <strong className="font-mono text-zinc-100 tabular-nums">{players.length}</strong> participantes
          </span>
          {report && (
            <>
              <span>·</span>
              <span className="text-emerald-400 font-semibold">
                <strong className="font-mono tabular-nums">{report.averageAccuracy}%</strong> acerto geral
              </span>
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
                <span className="font-mono text-zinc-300 font-semibold tabular-nums">
                  {p.score} pts
                </span>
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
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-200 text-xs font-medium border border-zinc-800 transition-colors flex items-center gap-1.5"
          >
            <ChartBar size={14} weight="bold" />
            <span>Diagnóstico da Turma</span>
          </button>
        )}

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs font-medium border border-zinc-800 transition-colors flex items-center gap-1.5"
          title="Baixar planilha CSV com o resultado de todos os alunos"
        >
          <DownloadSimple size={14} weight="bold" />
          <span>Exportar CSV</span>
        </button>

        <button
          onClick={() => onRestart(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-extrabold font-display shadow-sm transition-colors flex items-center gap-1.5"
          title="Zerar pontos e começar a 1ª questão agora com a mesma turma conectada"
        >
          <Play size={14} weight="fill" />
          <span>Jogar Novamente</span>
        </button>

        <button
          onClick={() => onRestart(false)}
          className="px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          title="Voltar para a tela de espera (Lobby) mantendo os alunos conectados"
        >
          <ArrowCounterClockwise size={14} weight="bold" />
          <span>Voltar ao Lobby</span>
        </button>

        <button
          onClick={onExit}
          className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-300 hover:text-rose-300 text-xs font-medium border border-zinc-800 hover:border-rose-500/30 transition-colors flex items-center gap-1.5"
        >
          <SignOut size={14} weight="bold" />
          <span>Encerrar Sala</span>
        </button>
      </div>

      {showBreakdown && report && (
        <ReportDiagnosticsModal report={report} onClose={() => setShowBreakdown(false)} />
      )}
    </div>
  );
};
