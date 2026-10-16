import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Session, Quiz, Player, Answer, QuizReport, QuestionReportSummary } from '../types/quiz';
import {
  subscribeToSession,
  subscribeToPlayers,
  subscribeToAnswers,
  updateSessionState,
  joinSessionAsPlayer,
  submitAnswer,
} from '../services/quizService';
import { saveQuizReport } from '../services/reportService';
import { soundEffects } from '../lib/soundEffects';
import { LiveCharts } from '../components/LiveCharts';
import { DataCloud } from '../components/DataCloud';
import { Podium } from '../components/Podium';
import { WaitingRoomIllustration } from '../components/BrandIllustrations';
import { QUESTION_TYPES_META } from '../lib/quizHelpers';
import {
  Users,
  Play,
  ArrowRight,
  Flame,
  ArrowsOut,
  CheckCircle,
  UserPlus,
  Robot,
  Copy,
  Check,
  Lightbulb,
  DeviceMobile,
  SignOut,
  QrCode,
  LinkSimple,
  X,
  SpeakerHigh,
  SpeakerSlash,
} from '@phosphor-icons/react';

interface TelaoViewProps {
  sessionId: string;
  quizzes: Quiz[];
  onExit: (endRoom?: boolean) => void;
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
  const [allAnswersHistory, setAllAnswersHistory] = useState<Answer[]>([]);
  const [consolidatedReport, setConsolidatedReport] = useState<QuizReport | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEffects.getMuted());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closingRef = useRef(false);

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

  const currentQuiz = quizzes.find((q) => q.id === session?.quizId) || quizzes[0];
  const currentQuestionIndex = session?.currentQuestionIndex ?? 0;
  const currentQuestion = currentQuiz?.questions[currentQuestionIndex];
  const totalQuestions = currentQuiz?.questions?.length || 1;

  // Subscribe to Answers for current question
  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToAnswers(sessionId, currentQuestionIndex, (updated) => {
      setAnswers(updated);
      if (updated.length > 0) {
        setAllAnswersHistory((prev) => {
          const map = new Map<string, Answer>();
          prev.forEach((a) => map.set(a.id, a));
          updated.forEach((a) => map.set(a.id, a));
          return Array.from(map.values());
        });
      }
    });
    return () => unsub();
  }, [sessionId, currentQuestionIndex]);

  const handleCloseQuestion = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    try {
      soundEffects.playReveal();
      await updateSessionState(sessionId, {
        status: 'result',
        isAcceptingAnswers: false,
      });
    } finally {
      closingRef.current = false;
    }
  }, [sessionId]);

  // Timer countdown handler with sound warning on final seconds
  useEffect(() => {
    if (session?.status === 'question' && session.isAcceptingAnswers) {
      const limit = session.timeLimitSeconds || currentQuestion?.timeLimit || 20;
      setTimeLeft(limit);
      closingRef.current = false;

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) return 0;
          const next = prev - 1;
          if (next <= 5 && next > 0) {
            soundEffects.playUrgentTick();
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.status, session?.currentQuestionIndex, session?.isAcceptingAnswers]);

  // Close question automatically when timer hits 0
  useEffect(() => {
    if (session?.status === 'question' && session.isAcceptingAnswers && timeLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      handleCloseQuestion();
    }
  }, [timeLeft, session?.status, session?.isAcceptingAnswers, handleCloseQuestion]);

  const handleToggleSound = () => {
    const nextMuted = soundEffects.toggleMute();
    setIsMuted(nextMuted);
  };

  const buildAndSaveReport = async (): Promise<QuizReport | null> => {
    if (!session || !currentQuiz) return null;
    try {
      const sorted = [...players].sort((a, b) => b.score - a.score);
      const totalAnswersCount = allAnswersHistory.length;
      const correctAnswersCount = allAnswersHistory.filter((a) => a.isCorrect).length;
      const avgAccuracy =
        totalAnswersCount > 0 ? Math.round((correctAnswersCount / totalAnswersCount) * 100) : 0;

      const questionsSummary: QuestionReportSummary[] = currentQuiz.questions.map((q, qIdx) => {
        const qAnswers = allAnswersHistory.filter((a) => a.questionIndex === qIdx);
        const qCorrect = qAnswers.filter((a) => a.isCorrect).length;
        const accuracyPercentage =
          qAnswers.length > 0 ? Math.round((qCorrect / qAnswers.length) * 100) : 0;
        return {
          questionIndex: qIdx,
          questionText: q.question,
          questionType: q.type,
          totalAnswers: qAnswers.length,
          correctAnswers: qCorrect,
          accuracyPercentage,
        };
      });

      const rep = await saveQuizReport({
        teacherId: session.hostId || 'prof_local',
        sessionId: session.id,
        quizId: currentQuiz.id,
        quizTitle: currentQuiz.title,
        subject: currentQuiz.subject,
        totalQuestions: currentQuiz.questions.length,
        totalPlayers: players.length,
        averageAccuracy: avgAccuracy,
        top3: sorted.slice(0, 3).map((p) => ({ nickname: p.nickname, score: p.score })),
        playersRanking: sorted.map((p) => ({
          nickname: p.nickname,
          score: p.score,
          streak: p.streak,
        })),
        questionsSummary,
      });

      setConsolidatedReport(rep);
      return rep;
    } catch (err) {
      console.warn('Could not compile report:', err);
      return null;
    }
  };

  const handleStartQuiz = async () => {
    if (!currentQuestion) return;
    soundEffects.playTick();
    await updateSessionState(sessionId, {
      status: 'question',
      currentQuestionIndex: 0,
      isAcceptingAnswers: true,
      timeLimitSeconds: currentQuestion.timeLimit,
      questionStartedAt: Date.now(),
    });
  };

  const handleShowLeaderboard = async () => {
    await updateSessionState(sessionId, {
      status: 'leaderboard',
    });
  };

  const handleNextStep = async () => {
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < totalQuestions) {
      const nextQ = currentQuiz.questions[nextIdx];
      soundEffects.playTick();
      await updateSessionState(sessionId, {
        status: 'question',
        currentQuestionIndex: nextIdx,
        isAcceptingAnswers: true,
        timeLimitSeconds: nextQ.timeLimit,
        questionStartedAt: Date.now(),
      });
    } else {
      await buildAndSaveReport();
      await updateSessionState(sessionId, {
        status: 'podium',
        isAcceptingAnswers: false,
      });
    }
  };

  const handleRestart = async () => {
    await updateSessionState(sessionId, {
      status: 'lobby',
      currentQuestionIndex: 0,
      isAcceptingAnswers: false,
    });
  };

  const handleEndSessionAndExit = async () => {
    await buildAndSaveReport();
    await updateSessionState(sessionId, {
      status: 'finished',
      isAcceptingAnswers: false,
    });
    onExit(true);
  };

  const handleAddTestStudents = async () => {
    const testNames = ['Lucas Silva', 'Mariana Costa', 'Pedro Henrique', 'Camila Santos', 'Gabriel Rocha'];
    for (const name of testNames) {
      if (!players.some((p) => p.nickname === name)) {
        await joinSessionAsPlayer(sessionId, name);
      }
    }
  };

  const handleSimulateAnswers = async () => {
    if (!currentQuestion || !session || session.status !== 'question') return;
    for (const p of players) {
      if (answers.some((a) => a.playerId === p.id)) continue;

      let answerVal: any = '';
      let isCorrect = Math.random() > 0.25;

      switch (currentQuestion.type) {
        case 'boolean':
        case 'multiple':
        case 'image':
        case 'media': {
          const opts = currentQuestion.options || ['A', 'B'];
          const correct = currentQuestion.correctAnswer || opts[0];
          answerVal = isCorrect ? correct : opts.find((o) => o !== correct) || opts[0];
          break;
        }

        case 'short_answer': {
          if (isCorrect) {
            answerVal =
              currentQuestion.correctAnswer || currentQuestion.acceptedAnswers?.[0] || 'Fotossíntese';
          } else {
            answerVal = 'Termo alternativo';
          }
          break;
        }

        case 'matching': {
          const pairs = currentQuestion.pairs || [];
          const mapping: Record<string, string> = {};
          pairs.forEach((pair) => {
            if (isCorrect) {
              mapping[pair.id] = pair.right;
            } else {
              const randomRight =
                pairs[Math.floor(Math.random() * pairs.length)]?.right || pair.right;
              mapping[pair.id] = randomRight;
            }
          });
          answerVal = mapping;
          break;
        }

        case 'ordering': {
          const items = currentQuestion.itemsOrder || [];
          if (isCorrect) {
            answerVal = [...items];
          } else {
            answerVal = [...items].sort(() => Math.random() - 0.5);
          }
          break;
        }

        case 'word_cloud': {
          const sampleWords = [
            'Engajamento',
            'Autonomia',
            'Feedback',
            'Inovação',
            'Diagnóstico',
            'Colaboração',
            'Aprendizagem',
            'Reflexão',
          ];
          answerVal = sampleWords[Math.floor(Math.random() * sampleWords.length)];
          isCorrect = true;
          break;
        }

        case 'poll': {
          const opts = currentQuestion.options || ['Opção A', 'Opção B'];
          answerVal = opts[Math.floor(Math.random() * opts.length)];
          isCorrect = true;
          break;
        }

        case 'open_ended': {
          const sampleTexts = [
            'A avaliação deve acompanhar todo o percurso e fornecer retorno contínuo.',
            'Permite ao professor calibrar o ritmo e adaptar as estratégias de ensino.',
            'Estimula a autoavaliação e o protagonismo do estudante em sala de aula.',
          ];
          answerVal = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
          isCorrect = true;
          break;
        }

        default:
          answerVal =
            currentQuestion.correctAnswer ||
            (currentQuestion.options && currentQuestion.options[0]) ||
            '';
      }

      const timeSpent = Math.floor(1500 + Math.random() * 5000);
      const points = isCorrect ? Math.round((currentQuestion.points || 1000) * 0.85) : 0;

      await submitAnswer(
        sessionId,
        {
          sessionId,
          questionIndex: currentQuestionIndex,
          playerId: p.id,
          playerNickname: p.nickname,
          answer: answerVal,
          isCorrect,
          pointsAwarded: points,
          timeSpentMs: timeSpent,
        },
        p.score,
        p.streak
      );
    }
  };

  // Build direct join URL and QR Code
  useEffect(() => {
    if (!session?.pin) return;

    let cancelled = false;
    const resolveUrlAndQr = async () => {
      let baseOrigin = window.location.origin;
      const isLocalhost =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      if (isLocalhost) {
        try {
          const resp = await fetch('/api/network-info');
          if (resp.ok) {
            const info = await resp.json();
            if (info?.lanIp) {
              const portPart = info.port ? `:${info.port}` : '';
              baseOrigin = `${window.location.protocol}//${info.lanIp}${portPart}`;
            }
          }
        } catch {}
      }

      const fullJoinUrl = `${baseOrigin}/?pin=${session.pin}`;
      if (cancelled) return;
      setJoinUrl(fullJoinUrl);

      try {
        const dataUrl = await QRCode.toDataURL(fullJoinUrl, {
          width: 440,
          margin: 1,
          color: {
            dark: '#09090b',
            light: '#ffffff',
          },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('QR Code generation error:', err);
      }
    };

    resolveUrlAndQr();
    return () => {
      cancelled = true;
    };
  }, [session?.pin]);

  const copyPin = () => {
    if (!session?.pin) return;
    navigator.clipboard.writeText(session.pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const copyDirectLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Keyboard shortcuts for classroom clicker / spacebar / arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape' && isQrExpanded) {
        setIsQrExpanded(false);
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleSound();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        if (!session) return;
        if (session.status === 'lobby' && players.length > 0) {
          e.preventDefault();
          handleStartQuiz();
        } else if (session.status === 'question') {
          e.preventDefault();
          handleCloseQuestion();
        } else if (session.status === 'result') {
          e.preventDefault();
          handleShowLeaderboard();
        } else if (session.status === 'leaderboard') {
          e.preventDefault();
          handleNextStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!session) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-zinc-500 text-xs font-mono">
        Carregando apresentação...
      </div>
    );
  }

  const questionMeta = currentQuestion ? QUESTION_TYPES_META[currentQuestion.type] : null;
  const QuestionTypeIcon = questionMeta?.icon;

  // 1. LOBBY VIEW
  if (session.status === 'lobby') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 min-h-[85vh] flex flex-col justify-between">
        {/* Minimal Control Bar */}
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-zinc-100 text-sm">{session.quizTitle}</span>
            <span className="text-zinc-500 font-mono text-[11px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              {totalQuestions} {totalQuestions === 1 ? 'questão' : 'questões'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Mute/Unmute Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border transition-colors ${
                isMuted
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  : 'bg-zinc-900 border-amber-500/40 text-amber-400 hover:bg-zinc-850'
              }`}
              title={isMuted ? 'Ativar efeitos sonoros (M)' : 'Silenciar áudio (M)'}
            >
              {isMuted ? <SpeakerSlash size={15} weight="bold" /> : <SpeakerHigh size={15} weight="bold" />}
            </button>

            <button
              onClick={onNavigateToStudent}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Abrir simulador de aluno"
            >
              <DeviceMobile size={14} weight="regular" />
              <span className="hidden sm:inline">Visão do Aluno</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Tela cheia (F)"
            >
              <ArrowsOut size={15} weight="bold" />
            </button>

            <button
              onClick={handleEndSessionAndExit}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-500/30 text-zinc-400 hover:text-rose-300 text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Encerrar sala"
            >
              <SignOut size={14} weight="bold" />
              <span>Encerrar</span>
            </button>
          </div>
        </div>

        {/* Bento Grid Lobby */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 my-auto">
          {/* Bento Cell: QR Code + PIN Billboard (3 cols) */}
          <div className="md:col-span-3 p-6 sm:p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 my-auto">
              {/* QR Code Column */}
              {qrDataUrl && (
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsQrExpanded(true)}
                    title="Clique para ampliar o QR Code na tela inteira"
                    className="p-3 rounded-2xl bg-white shadow-md hover:scale-[1.03] active:scale-[0.99] transition-transform cursor-pointer group relative"
                  >
                    <img
                      src={qrDataUrl}
                      alt={`QR Code PIN ${session.pin}`}
                      className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
                    />
                    <span className="absolute inset-x-2 bottom-1.5 py-0.5 rounded bg-zinc-950/85 text-[10px] font-mono text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity">
                      Ampliar QR
                    </span>
                  </button>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <QrCode size={12} weight="bold" />
                    <span>Aponte a câmera</span>
                  </span>
                </div>
              )}

              {/* PIN Billboard Column */}
              <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left space-y-3">
                <span className="text-[11px] uppercase tracking-widest text-zinc-500 font-mono font-semibold">
                  Código PIN de Acesso Direto
                </span>

                <div className="telao-pin text-zinc-100 tabular-nums select-all">
                  {session.pin.slice(0, 3)} {session.pin.slice(3)}
                </div>

                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs">
                  Escaneie o QR Code para entrar sem digitar ou informe o código PIN na aba Aluno.
                </p>

                {/* Action Pills: Copy PIN & Copy Direct Link */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={copyPin}
                    className="px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    {copiedPin ? (
                      <>
                        <Check size={14} weight="bold" className="text-emerald-400" />
                        <span className="text-emerald-400">PIN Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} weight="bold" className="text-zinc-400" />
                        <span>Copiar PIN</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={copyDirectLink}
                    className="px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <Check size={14} weight="bold" className="text-emerald-400" />
                        <span className="text-emerald-400">Link Copiado</span>
                      </>
                    ) : (
                      <>
                        <LinkSimple size={14} weight="bold" className="text-zinc-400" />
                        <span>Copiar Link Direto</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Link Bar */}
            {joinUrl && (
              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-500 gap-2">
                <span className="truncate">{joinUrl}</span>
                <button
                  type="button"
                  onClick={() => setIsQrExpanded(true)}
                  className="text-zinc-400 hover:text-zinc-200 shrink-0 underline underline-offset-2"
                >
                  Expandir QR
                </button>
              </div>
            )}
          </div>

          {/* Bento Cell: Connected Students (2 cols) */}
          <div className="md:col-span-2 p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60 text-xs">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <Users size={16} weight="regular" className="text-zinc-400" />
                <span>Participantes Conectados</span>
              </div>
              <span className="font-mono text-zinc-100 font-bold bg-zinc-850 px-2.5 py-0.5 rounded-md border border-zinc-800 tabular-nums">
                {players.length}
              </span>
            </div>

            {players.length === 0 ? (
              <div className="py-4 text-center space-y-2.5 my-auto">
                <WaitingRoomIllustration className="w-28 h-20 mx-auto" />
                <p className="text-zinc-400 text-xs font-medium">
                  Aguardando a turma entrar na sala...
                </p>
                <button
                  type="button"
                  onClick={handleAddTestStudents}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <UserPlus size={14} weight="bold" />
                  <span>Adicionar 5 alunos de teste</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1 my-auto">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="px-3 py-1 rounded-xl bg-zinc-850 border border-zinc-750 text-zinc-200 text-xs font-medium flex items-center gap-1.5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{p.nickname}</span>
                  </div>
                ))}
              </div>
            )}

            {players.length > 0 && (
              <button
                type="button"
                onClick={handleAddTestStudents}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 text-center transition-colors pt-2 font-mono"
              >
                + Adicionar alunos de teste
              </button>
            )}
          </div>
        </div>

        {/* Minimal Launch Action */}
        <div className="text-center space-y-2 pt-2">
          <button
            onClick={handleStartQuiz}
            disabled={players.length === 0}
            className="px-8 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-display font-extrabold text-base shadow-sm transition-all flex items-center gap-2.5 mx-auto active:scale-[0.98]"
          >
            <Play size={16} weight="fill" />
            <span>Tá Valendo! Iniciar Rodada</span>
          </button>
          <span className="text-[10px] font-mono text-zinc-500 block">
            Atalhos: Espaço/Seta para avançar · M para áudio · F para tela cheia
          </span>
        </div>

        {/* Expanded QR Code Modal */}
        {isQrExpanded && qrDataUrl && (
          <div
            onClick={() => setIsQrExpanded(false)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-lg w-full text-center space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                  Acesso Rápido por Câmera
                </span>
                <button
                  type="button"
                  onClick={() => setIsQrExpanded(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              <div className="p-5 rounded-3xl bg-white inline-block mx-auto shadow-lg">
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${session.pin}`}
                  className="w-72 h-72 sm:w-80 sm:h-80 object-contain"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 block">
                  Código PIN
                </span>
                <div className="telao-pin text-zinc-100 tabular-nums">
                  {session.pin.slice(0, 3)} {session.pin.slice(3)}
                </div>
                <p className="text-xs text-zinc-400 font-mono pt-1 break-all">{joinUrl}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. ACTIVE QUESTION VIEW
  if (session.status === 'question' && currentQuestion) {
    const answeredCount = answers.length;
    const limitSecs = session.timeLimitSeconds || currentQuestion.timeLimit || 20;
    const progressPct = Math.min(100, Math.max(0, ((limitSecs - timeLeft) / limitSecs) * 100));
    const allAnswered = players.length > 0 && answeredCount >= players.length;

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 min-h-[85vh] flex flex-col justify-between">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-zinc-200 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg tabular-nums">
              {currentQuestionIndex + 1}/{totalQuestions}
            </span>
            {questionMeta && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-zinc-300 font-medium">
                {QuestionTypeIcon && <QuestionTypeIcon size={13} weight="bold" className="text-amber-400" />}
                <span>{questionMeta.label}</span>
              </span>
            )}

            {/* Late arrival PIN / QR shortcut */}
            <button
              type="button"
              onClick={() => setIsQrExpanded(true)}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 hover:text-white"
              title="Exibir QR Code para aluno retardatário"
            >
              <QrCode size={13} weight="bold" />
              <span>PIN {session.pin}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-1.5 rounded-lg border transition-colors ${
                isMuted
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  : 'bg-zinc-900 border-amber-500/40 text-amber-400 hover:bg-zinc-850'
              }`}
              title={isMuted ? 'Ativar sons' : 'Silenciar sons'}
            >
              {isMuted ? <SpeakerSlash size={14} weight="bold" /> : <SpeakerHigh size={14} weight="bold" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Tela cheia"
            >
              <ArrowsOut size={14} weight="bold" />
            </button>

            <div className="flex items-center gap-1.5 bg-zinc-900/70 px-3 py-1 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-400">
              <Users size={14} weight="regular" />
              <span className="text-zinc-100 font-bold tabular-nums">
                {answeredCount}/{players.length}
              </span>
            </div>

            {players.length > 0 && answeredCount < players.length && (
              <button
                type="button"
                onClick={handleSimulateAnswers}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors flex items-center gap-1.5 border border-zinc-800"
                title="Simular respostas dos alunos de teste"
              >
                <Robot size={14} weight="bold" />
                <span>Simular Votos</span>
              </button>
            )}

            <button
              onClick={handleCloseQuestion}
              className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                allAnswered
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm'
                  : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700'
              }`}
            >
              <span>Revelar Resultado</span>
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>
        </div>

        {/* Question Prompt */}
        <div className="text-center space-y-4 py-2">
          <h2 className="telao-question text-zinc-100 max-w-4xl mx-auto">
            {currentQuestion.question}
          </h2>

          {/* Minimalist Countdown Clock */}
          <div className="flex flex-col items-center justify-center pt-1">
            <div
              className={`w-16 h-16 rounded-full border-2 flex items-center justify-center font-bold text-2xl font-mono tabular-nums transition-colors ${
                timeLeft <= 5
                  ? 'border-rose-500 text-rose-400 bg-rose-950/25 animate-pulse'
                  : timeLeft <= 10
                  ? 'border-amber-500 text-amber-400 bg-amber-950/25'
                  : 'border-zinc-700 text-zinc-100 bg-zinc-900/50'
              }`}
            >
              {timeLeft}
            </div>
          </div>
        </div>

        {/* Live Options Grid */}
        <div className="w-full">
          <LiveCharts question={currentQuestion} answers={answers} showCorrect={false} />
        </div>

        {/* Progress Line */}
        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-300 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* QR Code Popup */}
        {isQrExpanded && qrDataUrl && (
          <div
            onClick={() => setIsQrExpanded(false)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                  Acesso de Aluno Retardatário
                </span>
                <button
                  type="button"
                  onClick={() => setIsQrExpanded(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white inline-block mx-auto">
                <img
                  src={qrDataUrl}
                  alt={`QR Code PIN ${session.pin}`}
                  className="w-56 h-56 object-contain"
                />
              </div>

              <div>
                <span className="text-xl font-bold font-mono text-zinc-100">
                  PIN: {session.pin.slice(0, 3)} {session.pin.slice(3)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. RESULT VIEW
  if (session.status === 'result' && currentQuestion) {
    const isOpinion = questionMeta?.isOpinion;
    const showTopCorrectBadge =
      Boolean(currentQuestion.correctAnswer) &&
      !isOpinion &&
      currentQuestion.type !== 'short_answer';

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 min-h-[85vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-zinc-300 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
              Resultado #{currentQuestionIndex + 1}
            </span>
            {questionMeta && (
              <span className="text-zinc-400 font-medium hidden sm:inline">
                {questionMeta.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSound}
              className={`p-1.5 rounded-lg border transition-colors ${
                isMuted
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  : 'bg-zinc-900 border-amber-500/40 text-amber-400 hover:bg-zinc-850'
              }`}
              title={isMuted ? 'Ativar sons' : 'Silenciar sons'}
            >
              {isMuted ? <SpeakerSlash size={14} weight="bold" /> : <SpeakerHigh size={14} weight="bold" />}
            </button>

            <button
              onClick={handleShowLeaderboard}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-[0.98]"
            >
              <span>Classificação</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        </div>

        {/* Question Statement & Answer Highlight */}
        <div className="text-center space-y-2.5">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 max-w-3xl mx-auto leading-snug">
            {currentQuestion.question}
          </h2>

          {showTopCorrectBadge && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-xs sm:text-sm font-semibold text-emerald-300">
              <CheckCircle size={16} weight="fill" className="text-emerald-400" />
              <span>Gabarito: {currentQuestion.correctAnswer}</span>
            </div>
          )}

          {isOpinion && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
              <CheckCircle size={15} weight="fill" className="text-zinc-400" />
              <span>Sondagem e Participação da Turma</span>
            </div>
          )}
        </div>

        {/* Live Charts with Answer Highlighted */}
        <div className="w-full">
          <LiveCharts question={currentQuestion} answers={answers} showCorrect={true} />
        </div>

        {/* Concise Pedagogical Explanation */}
        {currentQuestion.explanation && (
          <div className="max-w-4xl mx-auto w-full p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-300 flex items-start gap-2.5">
            <Lightbulb size={17} weight="duotone" className="text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{currentQuestion.explanation}</p>
          </div>
        )}

        {/* Minimal Class Analytics */}
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
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 min-h-[85vh] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest font-semibold block">
              Parcial da Rodada · {currentQuestionIndex + 1}/{totalQuestions}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">Classificação da Turma</h2>
          </div>

          <button
            onClick={handleToggleSound}
            className={`p-1.5 rounded-lg border transition-colors ${
              isMuted
                ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                : 'bg-zinc-900 border-amber-500/40 text-amber-400 hover:bg-zinc-850'
            }`}
            title={isMuted ? 'Ativar sons' : 'Silenciar sons'}
          >
            {isMuted ? <SpeakerSlash size={14} weight="bold" /> : <SpeakerHigh size={14} weight="bold" />}
          </button>
        </div>

        {/* Clean Ranking List */}
        <div className="space-y-2.5 my-auto">
          {top5.map((p, idx) => (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                idx === 0
                  ? 'bg-zinc-850 border-zinc-700 shadow-sm'
                  : 'bg-zinc-900/50 border-zinc-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg font-mono text-xs flex items-center justify-center font-bold ${
                    idx === 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {idx + 1}
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-100 text-sm">{p.nickname}</h4>
                  {p.streak > 1 && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1 font-mono">
                      <Flame size={12} weight="fill" />
                      <span>{p.streak} seguidas</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-lg font-bold text-zinc-100 font-mono tabular-nums">
                  {p.score}
                </span>
                <span className="text-[10px] text-zinc-500 block font-mono">pts</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="text-center pt-2">
          <button
            onClick={handleNextStep}
            className="px-6 py-3 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 mx-auto active:scale-[0.98]"
          >
            <span>{isLastQuestion ? 'Exibir Pódio Final' : 'Próxima Questão'}</span>
            <ArrowRight size={15} weight="bold" />
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
        report={consolidatedReport}
        onRestart={handleRestart}
        onExit={handleEndSessionAndExit}
      />
    );
  }

  return null;
};
