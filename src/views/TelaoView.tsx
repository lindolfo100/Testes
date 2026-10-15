import React, { useState, useEffect, useRef } from 'react';
import { Session, Quiz, Player, Answer } from '../types/quiz';
import {
  subscribeToSession,
  subscribeToPlayers,
  subscribeToAnswers,
  updateSessionState,
} from '../services/quizService';
import { LiveCharts } from '../components/LiveCharts';
import { DataCloud } from '../components/DataCloud';
import { Podium } from '../components/Podium';
import {
  Users,
  Play,
  ArrowRight,
  Clock,
  Sparkles,
  Trophy,
  Flame,
  Volume2,
  VolumeX,
  Maximize2,
  CheckCircle2,
} from 'lucide-react';

interface TelaoViewProps {
  sessionId: string;
  quizzes: Quiz[];
  onExit: () => void;
  onNavigateToStudent: () => void;
}

export const TelaoView: React.FC<TelaoViewProps> = ({
  sessionId,
  quizzes,
  onExit,
  onNavigateToStudent,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to Session
  useEffect(() => {
    const unsub = subscribeToSession(sessionId, (updated) => {
      setSession(updated);
    });
    return () => unsub();
  }, [sessionId]);

  // Subscribe to Players
  useEffect(() => {
    const unsub = subscribeToPlayers(sessionId, (updated) => {
      setPlayers(updated);
    });
    return () => unsub();
  }, [sessionId]);

  // Find corresponding quiz
  const currentQuiz = quizzes.find((q) => q.id === session?.quizId) || quizzes[0];
  const currentQuestionIndex = session?.currentQuestionIndex ?? 0;
  const currentQuestion = currentQuiz?.questions[currentQuestionIndex];
  const totalQuestions = currentQuiz?.questions?.length || 1;

  // Subscribe to Answers for current question
  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToAnswers(sessionId, currentQuestionIndex, (updated) => {
      setAnswers(updated);
    });
    return () => unsub();
  }, [sessionId, currentQuestionIndex]);

  // Timer countdown handler
  useEffect(() => {
    if (session?.status === 'question' && session.isAcceptingAnswers) {
      const limit = session.timeLimitSeconds || currentQuestion?.timeLimit || 20;
      setTimeLeft(limit);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Auto close question when timer expires
            handleCloseQuestion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.status, session?.currentQuestionIndex]);

  // Start first question
  const handleStartQuiz = async () => {
    if (!currentQuestion) return;
    await updateSessionState(sessionId, {
      status: 'question',
      currentQuestionIndex: 0,
      isAcceptingAnswers: true,
      timeLimitSeconds: currentQuestion.timeLimit,
      questionStartedAt: Date.now(),
    });
  };

  // Close question and reveal results
  const handleCloseQuestion = async () => {
    await updateSessionState(sessionId, {
      status: 'result',
      isAcceptingAnswers: false,
    });
  };

  // Advance to leaderboard
  const handleShowLeaderboard = async () => {
    await updateSessionState(sessionId, {
      status: 'leaderboard',
    });
  };

  // Advance to next question or podium
  const handleNextStep = async () => {
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < totalQuestions) {
      const nextQ = currentQuiz.questions[nextIdx];
      await updateSessionState(sessionId, {
        status: 'question',
        currentQuestionIndex: nextIdx,
        isAcceptingAnswers: true,
        timeLimitSeconds: nextQ.timeLimit,
        questionStartedAt: Date.now(),
      });
    } else {
      // Finished all questions -> Show Podium
      await updateSessionState(sessionId, {
        status: 'podium',
        isAcceptingAnswers: false,
      });
    }
  };

  // Restart session
  const handleRestart = async () => {
    await updateSessionState(sessionId, {
      status: 'lobby',
      currentQuestionIndex: 0,
      isAcceptingAnswers: false,
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!session) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-slate-400">
        Carregando sala de apresentação...
      </div>
    );
  }

  // 1. LOBBY VIEW
  if (session.status === 'lobby') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10 min-h-[85vh] flex flex-col justify-between">
        {/* Top bar controls */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">{session.quizTitle}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-800 hover:text-white"
              title="Tela Cheia"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onExit}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:text-white"
            >
              Sair da Apresentação
            </button>
          </div>
        </div>

        {/* Central PIN Billboard */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-widest bg-indigo-950/60 px-4 py-1.5 rounded-full border border-indigo-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sessão Aberta · Conecte-se Agora</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Entre no quiz com seu smartphone ou computador
          </h2>

          <div className="inline-block bg-gradient-to-br from-indigo-900/60 to-slate-900 border-2 border-indigo-500/60 rounded-3xl p-8 sm:p-10 shadow-2xl">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-2">
              Código PIN da Sala
            </span>
            <div className="text-6xl sm:text-7xl md:text-8xl font-black text-white font-mono tracking-wider tabular-nums select-all drop-shadow-md">
              {session.pin.slice(0, 3)} {session.pin.slice(3)}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700/80 flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-300">
              <span>Ou clique em</span>
              <button
                onClick={onNavigateToStudent}
                className="text-indigo-400 font-bold underline hover:text-indigo-300"
              >
                Entrar como Aluno
              </button>
              <span>e digite o PIN</span>
            </div>
          </div>
        </div>

        {/* Connected Students List */}
        <div className="bg-slate-850 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <div className="flex items-center gap-2 text-white font-bold">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Estudantes Conectados</span>
            </div>
            <span className="text-sm font-bold text-indigo-400 font-mono tabular-nums bg-indigo-950 px-3 py-1 rounded-full border border-indigo-800/60">
              {players.length} {players.length === 1 ? 'aluno' : 'alunos'}
            </span>
          </div>

          {players.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm italic">
              Aguardando os alunos entrarem na sala com o PIN...
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto pr-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm animate-fade-in"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{p.nickname}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Big Launch Button */}
        <div className="text-center pt-2">
          <button
            onClick={handleStartQuiz}
            disabled={players.length === 0}
            className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-lg font-black shadow-xl hover:shadow-indigo-500/25 transition-all flex items-center gap-3 mx-auto"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>Iniciar o Quiz ({totalQuestions} Perguntas)</span>
          </button>
          {players.length === 0 && (
            <span className="text-xs text-slate-500 mt-2 block">
              Dica: Você pode abrir a aba "Entrar como Aluno" para testar antes de iniciar!
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2. ACTIVE QUESTION VIEW
  if (session.status === 'question' && currentQuestion) {
    const answeredCount = answers.length;
    const progressPct = ((session.timeLimitSeconds! - timeLeft) / session.timeLimitSeconds!) * 100;

    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 min-h-[85vh] flex flex-col justify-between">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-indigo-950 text-indigo-400 font-bold text-xs uppercase border border-indigo-800">
              Pergunta {currentQuestionIndex + 1} de {totalQuestions}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {currentQuestion.type === 'boolean' ? 'Verdadeiro ou Falso' : 'Múltipla Escolha'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Live student response counter */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="font-mono tabular-nums text-white">
                {answeredCount}/{players.length}
              </span>
              <span className="text-slate-400">responderam</span>
            </div>

            <button
              onClick={handleCloseQuestion}
              className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
            >
              Encerrar Tempo Agora
            </button>
          </div>
        </div>

        {/* Question Prompt */}
        <div className="text-center space-y-4 py-4">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight max-w-4xl mx-auto">
            {currentQuestion.question}
          </h2>

          {/* Countdown Clock */}
          <div className="flex flex-col items-center justify-center pt-2">
            <div
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center font-black text-3xl font-mono tabular-nums shadow-lg transition-colors ${
                timeLeft <= 5
                  ? 'border-rose-500 text-rose-400 bg-rose-950/30 animate-pulse'
                  : timeLeft <= 10
                  ? 'border-amber-500 text-amber-400 bg-amber-950/30'
                  : 'border-indigo-500 text-white bg-slate-800'
              }`}
            >
              {timeLeft}
            </div>
            <span className="text-[11px] text-slate-400 uppercase tracking-widest mt-1">
              segundos
            </span>
          </div>
        </div>

        {/* Options on Telão (without revealing the answer yet) */}
        <div className="w-full">
          <LiveCharts question={currentQuestion} answers={answers} showCorrect={false} />
        </div>

        {/* Bottom progress bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    );
  }

  // 3. RESULT VIEW (Charts + Data Cloud + Explanation)
  if (session.status === 'result' && currentQuestion) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8 min-h-[85vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-emerald-950 text-emerald-400 font-bold text-xs uppercase border border-emerald-800">
              Resultados da Questão {currentQuestionIndex + 1}
            </span>
            <span className="text-xs text-slate-400">{session.quizTitle}</span>
          </div>

          <button
            onClick={handleShowLeaderboard}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md transition-colors flex items-center gap-2"
          >
            <span>Ver Classificação</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Question Statement */}
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white max-w-3xl mx-auto">
            {currentQuestion.question}
          </h2>
          <div className="text-sm font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Gabarito Correto: {currentQuestion.correctAnswer}</span>
          </div>
        </div>

        {/* 1. Live Charts with Correct Answer Highlighted */}
        <div className="w-full">
          <LiveCharts question={currentQuestion} answers={answers} showCorrect={true} />
        </div>

        {/* 2. Educational Explanation Box */}
        {currentQuestion.explanation && (
          <div className="max-w-4xl mx-auto w-full p-4 rounded-xl bg-slate-800/90 border border-slate-700 text-sm text-slate-200">
            <strong className="text-indigo-400 block mb-1">💡 Justificativa Pedagógica:</strong>
            <p className="leading-relaxed">{currentQuestion.explanation}</p>
          </div>
        )}

        {/* 3. Nuvem de Dados da Turma */}
        <div className="w-full">
          <DataCloud question={currentQuestion} answers={answers} totalPlayers={players.length} />
        </div>
      </div>
    );
  }

  // 4. LEADERBOARD VIEW
  if (session.status === 'leaderboard') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const top5 = sortedPlayers.slice(0, 5);
    const isLastQuestion = currentQuestionIndex + 1 >= totalQuestions;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 min-h-[85vh] flex flex-col justify-between">
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest flex items-center justify-center gap-1">
            <Trophy className="w-4 h-4 text-indigo-400" /> Classificação Parcial
          </span>
          <h2 className="text-3xl font-extrabold text-white">Top 5 da Turma</h2>
          <p className="text-xs text-slate-400">
            Rodada {currentQuestionIndex + 1} de {totalQuestions} finalizada
          </p>
        </div>

        {/* Ranking List */}
        <div className="bg-slate-850 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-3">
          {top5.map((p, idx) => (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                idx === 0
                  ? 'bg-amber-950/40 border-amber-500/70 ring-1 ring-amber-400/30'
                  : idx === 1
                  ? 'bg-slate-800 border-slate-600'
                  : 'bg-slate-800/60 border-slate-700/70'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold font-mono text-sm ${
                    idx === 0
                      ? 'bg-amber-500 text-amber-950 font-black'
                      : idx === 1
                      ? 'bg-slate-300 text-slate-900'
                      : idx === 2
                      ? 'bg-amber-700 text-amber-100'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {idx + 1}
                </div>
                <div>
                  <h4 className="font-bold text-white text-base sm:text-lg">{p.nickname}</h4>
                  {p.streak > 1 && (
                    <span className="text-xs text-amber-400 flex items-center gap-1 font-mono">
                      <Flame className="w-3.5 h-3.5" /> Sequência de {p.streak} acertos!
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-white font-mono tabular-nums">
                  {p.score}
                </span>
                <span className="text-xs text-slate-400 block">pontos</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="text-center pt-4">
          <button
            onClick={handleNextStep}
            className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl transition-colors flex items-center gap-2 mx-auto"
          >
            <span>{isLastQuestion ? 'Exibir Pódio Final' : 'Próxima Pergunta'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // 5. PODIUM VIEW
  if (session.status === 'podium') {
    return (
      <Podium
        players={players}
        quizTitle={session.quizTitle}
        totalQuestions={totalQuestions}
        onRestart={handleRestart}
        onExit={onExit}
      />
    );
  }

  return null;
};
