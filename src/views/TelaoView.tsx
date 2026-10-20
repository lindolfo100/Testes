import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Session, Quiz, Question, Player, Answer, QuizReport, QuestionReportSummary } from '../types/quiz';
import {
  subscribeToSession,
  subscribeToPlayers,
  subscribeToAnswers,
  updateSessionState,
  joinSessionAsPlayer,
  submitAnswer,
  gradeAnswerAsHost,
  getSessionPrivateQuestions,
  restartLiveSession,
} from '../services/quizService';
import { saveQuizReport } from '../services/reportService';
import { resolveCurrentUid } from '../lib/firebase';
import { soundEffects } from '../lib/soundEffects';
import { LiveCharts } from '../components/LiveCharts';
import { DataCloud } from '../components/DataCloud';
import { Podium } from '../components/Podium';
import {
  WaitingRoomIllustration,
  LeaderboardBadgeIllustration,
} from '../components/BrandIllustrations';
import { QUESTION_TYPES_META, checkAnswerCorrectness } from '../lib/quizHelpers';
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
  ArrowCounterClockwise,
  Trophy,
  DotsThree,
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
  const [privateQuestions, setPrivateQuestions] = useState<Question[] | null>(null);
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEffects.getMuted());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closingRef = useRef(false);
  const reportSavedRef = useRef(false);
  const gradedAnswerIdsRef = useRef<Set<string>>(new Set());

  // Load full unredacted questions from private host subcollection
  useEffect(() => {
    if (!sessionId) return;
    getSessionPrivateQuestions(sessionId).then((qs) => {
      if (qs && qs.length > 0) {
        setPrivateQuestions(qs);
      }
    });
  }, [sessionId]);

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
  const sessionQuestions = privateQuestions?.length
    ? privateQuestions
    : currentQuiz?.questions?.length
    ? currentQuiz.questions
    : session?.questions || [];
  const currentQuestionIndex = session?.currentQuestionIndex ?? 0;
  const currentQuestion = sessionQuestions[currentQuestionIndex];
  const totalQuestions = sessionQuestions.length || 1;

  // Subscribe to Answers for current question and perform authoritative host grading
  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToAnswers(sessionId, currentQuestionIndex, (updated) => {
      const processed = updated.map((ans) => {
        if (!ans.gradedByHost && !gradedAnswerIdsRef.current.has(ans.id) && currentQuestion) {
          gradedAnswerIdsRef.current.add(ans.id);
          const isCorrect = checkAnswerCorrectness(currentQuestion, ans.answer);
          const startedAt = session?.questionStartedAt || Date.now();
          const elapsedMs = Math.max(500, Date.now() - startedAt);
          const basePoints = currentQuestion.points ?? 1000;
          const timeLimitMs = (session?.timeLimitSeconds || currentQuestion.timeLimit || 20) * 1000;
          const speedRatio = Math.max(0.2, Math.min(1, (timeLimitMs - elapsedMs) / timeLimitMs));
          const pointsAwarded =
            isCorrect && basePoints > 0 ? Math.round(basePoints * (0.6 + 0.4 * speedRatio)) : 0;

          gradeAnswerAsHost(
            sessionId,
            ans.id,
            ans.playerId,
            isCorrect,
            pointsAwarded,
            elapsedMs
          ).catch((err) => console.warn('Host grading error:', err));

          return {
            ...ans,
            isCorrect,
            pointsAwarded,
            timeSpentMs: elapsedMs,
            gradedByHost: true,
          };
        }
        return ans;
      });

      setAnswers(processed);
      if (processed.length > 0) {
        setAllAnswersHistory((prev) => {
          const map = new Map<string, Answer>();
          prev.forEach((a) => map.set(a.id, a));
          processed.forEach((a) => map.set(a.id, a));
          return Array.from(map.values());
        });
      }
    });
    return () => unsub();
  }, [
    sessionId,
    currentQuestionIndex,
    currentQuestion,
    session?.questionStartedAt,
    session?.timeLimitSeconds,
  ]);

  const buildRankingSnapshot = useCallback(
    () =>
      [...players]
        .sort((a, b) => b.score - a.score)
        .map((p) => ({ id: p.id, nickname: p.nickname, score: p.score, streak: p.streak })),
    [players]
  );

  const handleCloseQuestion = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    try {
      soundEffects.playReveal();
      await updateSessionState(sessionId, {
        status: 'result',
        isAcceptingAnswers: false,
        revealedQuestion: currentQuestion || null,
        rankingSnapshot: buildRankingSnapshot(),
      });
    } finally {
      closingRef.current = false;
    }
  }, [sessionId, currentQuestion, buildRankingSnapshot]);

  // Keep rankingSnapshot updated on the result screen when final host grading writes settle
  useEffect(() => {
    if (session?.status === 'result' && players.length > 0) {
      updateSessionState(sessionId, {
        rankingSnapshot: buildRankingSnapshot(),
      }).catch(() => {});
    }
  }, [session?.status, players, sessionId, buildRankingSnapshot]);

  // Timer countdown handler anchored to questionStartedAt (resilient to reloads and background tabs)
  useEffect(() => {
    if (session?.status === 'question' && session.isAcceptingAnswers) {
      const limit = session.timeLimitSeconds || currentQuestion?.timeLimit || 20;
      const startedAt = session.questionStartedAt || Date.now();
      closingRef.current = false;
      let lastPlayedTick = -1;

      if (timerRef.current) clearInterval(timerRef.current);

      const updateRemaining = () => {
        const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
        const next = Math.max(0, limit - elapsedSec);
        setTimeLeft(next);
        if (next <= 5 && next > 0 && next !== lastPlayedTick) {
          lastPlayedTick = next;
          soundEffects.playUrgentTick();
        }
      };

      updateRemaining();
      timerRef.current = setInterval(updateRemaining, 250);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    session?.status,
    session?.currentQuestionIndex,
    session?.isAcceptingAnswers,
    session?.questionStartedAt,
    session?.timeLimitSeconds,
    currentQuestion?.timeLimit,
  ]);

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
    if (!session) return null;
    if (reportSavedRef.current && consolidatedReport) return consolidatedReport;
    reportSavedRef.current = true;

    try {
      const sorted = [...players].sort((a, b) => b.score - a.score);

      const gradedAnswers = allAnswersHistory.filter((a) => {
        const q = sessionQuestions[a.questionIndex];
        return q && !QUESTION_TYPES_META[q.type]?.isOpinion;
      });
      const totalGradedCount = gradedAnswers.length;
      const correctGradedCount = gradedAnswers.filter((a) => a.isCorrect).length;
      const avgAccuracy =
        totalGradedCount > 0
          ? Math.round((correctGradedCount / totalGradedCount) * 100)
          : allAnswersHistory.length > 0
          ? 100
          : 0;

      const questionsSummary: QuestionReportSummary[] = sessionQuestions.map((q, qIdx) => {
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
        teacherId: session.hostId || resolveCurrentUid(),
        sessionId: session.id,
        quizId: session.quizId || currentQuiz?.id || 'custom_quiz',
        quizTitle: session.quizTitle || currentQuiz?.title || 'Quiz',
        subject: currentQuiz?.subject || 'Geral',
        totalQuestions: sessionQuestions.length,
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
      reportSavedRef.current = false;
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
      revealedQuestion: null,
      rankingSnapshot: [],
    });
  };

  const handleShowLeaderboard = async () => {
    await updateSessionState(sessionId, {
      status: 'leaderboard',
      rankingSnapshot: buildRankingSnapshot(),
    });
  };

  const handleNextStep = async () => {
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < totalQuestions) {
      const nextQ = sessionQuestions[nextIdx];
      soundEffects.playTick();
      await updateSessionState(sessionId, {
        status: 'question',
        currentQuestionIndex: nextIdx,
        isAcceptingAnswers: true,
        timeLimitSeconds: nextQ.timeLimit,
        questionStartedAt: Date.now(),
        revealedQuestion: null,
        rankingSnapshot: [],
      });
    } else {
      await buildAndSaveReport();
      await updateSessionState(sessionId, {
        status: 'podium',
        isAcceptingAnswers: false,
        rankingSnapshot: buildRankingSnapshot(),
      });
    }
  };

  const handleRestart = async (startImmediately = false) => {
    reportSavedRef.current = false;
    gradedAnswerIdsRef.current.clear();
    setConsolidatedReport(null);
    setAllAnswersHistory([]);
    setAnswers([]);
    const firstTimeLimit = sessionQuestions[0]?.timeLimit || 20;
    await restartLiveSession(sessionId, startImmediately, firstTimeLimit);
  };

  const handleJumpToPodium = async () => {
    await buildAndSaveReport();
    await updateSessionState(sessionId, {
      status: 'podium',
      isAcceptingAnswers: false,
      rankingSnapshot: buildRankingSnapshot(),
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

      await submitAnswer(sessionId, {
        sessionId,
        questionIndex: currentQuestionIndex,
        playerId: p.id,
        playerNickname: p.nickname,
        answer: answerVal,
        timeSpentMs: timeSpent,
      });
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

  // Shared top bar controls: only Sound, "⋯" menu, and Encerrar (with confirmation)
  const renderTopControls = (leftContent: React.ReactNode, extraRightBadge?: React.ReactNode) => (
    <div className="flex items-center justify-between gap-2 text-xs text-zinc-300 relative">
      <div className="flex items-center gap-2 min-w-0">{leftContent}</div>

      <div className="flex items-center gap-1.5 shrink-0">
        {extraRightBadge}

        {/* Som (Mute/Unmute) */}
        <button
          type="button"
          onClick={handleToggleSound}
          aria-label={isMuted ? 'Ativar efeitos sonoros' : 'Silenciar efeitos sonoros'}
          title={isMuted ? 'Ativar efeitos sonoros (M)' : 'Silenciar áudio (M)'}
          className={`min-w-[44px] min-h-[44px] p-2 rounded-xl border transition-colors flex items-center justify-center ${
            isMuted
              ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              : 'bg-zinc-900 border-amber-500/40 text-amber-400 hover:bg-zinc-850'
          }`}
        >
          {isMuted ? <SpeakerSlash size={16} weight="bold" /> : <SpeakerHigh size={16} weight="bold" />}
        </button>

        {/* Menu "⋯" com ações secundárias */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen((v) => !v)}
            aria-label="Mais opções do telão"
            title="Mais opções"
            className="min-w-[44px] min-h-[44px] p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 hover:text-white transition-colors flex items-center justify-center"
          >
            <DotsThree size={20} weight="bold" />
          </button>

          {isMoreMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMoreMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl py-1.5 z-50 text-xs text-zinc-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsQrExpanded(true);
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
                >
                  <QrCode size={16} weight="bold" className="text-sky-400" />
                  <span>Exibir QR Code / PIN ({session.pin})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    toggleFullscreen();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
                >
                  <ArrowsOut size={16} weight="bold" className="text-zinc-300" />
                  <span>Alternar Tela Cheia (F)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onNavigateToStudent();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
                >
                  <DeviceMobile size={16} weight="bold" className="text-zinc-300" />
                  <span>Simular Visão do Aluno</span>
                </button>

                {session.status !== 'lobby' && (
                  <>
                    <div className="my-1 border-t border-zinc-800" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        handleRestart(false);
                      }}
                      className="w-full min-h-[44px] px-4 py-2.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 text-amber-300 transition-colors"
                    >
                      <ArrowCounterClockwise size={16} weight="bold" />
                      <span>Recomeçar do Início</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        handleJumpToPodium();
                      }}
                      className="w-full min-h-[44px] px-4 py-2.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 text-amber-300 transition-colors"
                    >
                      <Trophy size={16} weight="bold" />
                      <span>Ir Direto para o Pódio</span>
                    </button>
                  </>
                )}

                {session.status === 'question' && players.length > 0 && answers.length < players.length && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleSimulateAnswers();
                    }}
                    className="w-full min-h-[44px] px-4 py-2.5 text-left hover:bg-zinc-800 flex items-center gap-2.5 text-zinc-300 transition-colors"
                  >
                    <Robot size={16} weight="bold" />
                    <span>Simular Votos de Teste</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Botão Encerrar (abre confirmação) */}
        <button
          type="button"
          onClick={() => setShowEndConfirm(true)}
          aria-label="Encerrar apresentação"
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-rose-950/50 border border-zinc-800 hover:border-rose-500/40 text-zinc-300 hover:text-rose-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <SignOut size={15} weight="bold" />
          <span>Encerrar</span>
        </button>
      </div>
    </div>
  );

  // Modal de confirmação ao encerrar sala
  const renderModals = () => (
    <>
      {showEndConfirm && (
        <div
          onClick={() => setShowEndConfirm(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
          >
            <h3 className="text-base font-bold text-zinc-100 font-display">
              Encerrar esta apresentação?
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              A sala ao vivo (PIN {session.pin}) será fechada para os alunos e o relatório da turma será salvo.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold transition-colors"
              >
                Continuar Aula
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEndConfirm(false);
                  handleEndSessionAndExit();
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-zinc-950 text-xs font-bold transition-colors"
              >
                Sim, Encerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {isQrExpanded && qrDataUrl && (
        <div
          onClick={() => setIsQrExpanded(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                Acesso Rápido por Câmera
              </span>
              <button
                type="button"
                onClick={() => setIsQrExpanded(false)}
                aria-label="Fechar QR Code ampliado"
                className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-center"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white inline-block mx-auto shadow-lg">
              <img
                src={qrDataUrl}
                alt={`QR Code ${session.pin}`}
                className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
              />
            </div>

            <div className="space-y-1">
              <span className="text-xs text-zinc-300 font-medium block">
                Código PIN
              </span>
              <div className="telao-pin text-white tabular-nums whitespace-nowrap">
                {`${session.pin.slice(0, 3)}\u00A0${session.pin.slice(3)}`}
              </div>
              <p className="text-xs text-zinc-300 font-mono pt-1 break-all">{joinUrl}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // 1. LOBBY VIEW
  if (session.status === 'lobby') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-32 space-y-6 min-h-[82vh] flex flex-col justify-between">
        {renderTopControls(
          <>
            <span className="font-bold text-zinc-100 text-sm truncate">{session.quizTitle}</span>
            <span className="text-zinc-300 font-mono text-xs bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 shrink-0 tabular-nums">
              {totalQuestions} {totalQuestions === 1 ? 'questão' : 'questões'}
            </span>
          </>
        )}

        {/* Bento Grid Lobby */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 my-auto">
          {/* Bento Cell: QR Code + PIN Billboard (3 cols) */}
          <div className="md:col-span-3 p-6 sm:p-8 rounded-2xl bg-zinc-900/55 border border-zinc-800/80 flex flex-col justify-between space-y-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 my-auto">
              {/* QR Code Column */}
              {qrDataUrl && (
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsQrExpanded(true)}
                    aria-label="Ampliar QR Code na tela inteira"
                    title="Clique para ampliar o QR Code na tela inteira"
                    className="p-3 rounded-2xl bg-white shadow-md hover:scale-[1.02] active:scale-[0.99] transition-transform cursor-pointer group relative"
                  >
                    <img
                      src={qrDataUrl}
                      alt={`QR Code PIN ${session.pin}`}
                      className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
                    />
                    <span className="absolute inset-x-2 bottom-1.5 py-0.5 rounded bg-zinc-950/90 text-[11px] font-medium text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity">
                      Ampliar QR
                    </span>
                  </button>
                  <span className="text-xs text-zinc-300 font-medium flex items-center gap-1">
                    <QrCode size={14} weight="bold" />
                    <span>Aponte a câmera</span>
                  </span>
                </div>
              )}

              {/* PIN Billboard Column */}
              <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left space-y-3 min-w-0">
                <span className="text-xs text-zinc-300 font-medium">
                  Código PIN de acesso
                </span>

                <div className="telao-pin text-white tabular-nums whitespace-nowrap">
                  {`${session.pin.slice(0, 3)}\u00A0${session.pin.slice(3)}`}
                </div>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xs">
                  Escaneie o QR Code ou digite o PIN no celular para entrar.
                </p>

                {/* Action Pills: Copy PIN & Copy Direct Link */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={copyPin}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-100 border border-zinc-750 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedPin ? (
                      <>
                        <Check size={14} weight="bold" className="text-emerald-400" />
                        <span className="text-emerald-300">PIN Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} weight="bold" className="text-zinc-300" />
                        <span>Copiar PIN</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={copyDirectLink}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-100 border border-zinc-750 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <Check size={14} weight="bold" className="text-emerald-400" />
                        <span className="text-emerald-300">Link Copiado</span>
                      </>
                    ) : (
                      <>
                        <LinkSimple size={14} weight="bold" className="text-zinc-300" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {joinUrl && (
              <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between text-xs font-mono text-zinc-300 gap-2">
                <span className="truncate">{joinUrl}</span>
                <button
                  type="button"
                  onClick={() => setIsQrExpanded(true)}
                  className="text-zinc-200 hover:text-white shrink-0 underline underline-offset-2 font-sans font-medium"
                >
                  Expandir QR
                </button>
              </div>
            )}
          </div>

          {/* Bento Cell: Connected Students (2 cols) */}
          <div className="md:col-span-2 p-6 rounded-2xl bg-zinc-900/55 border border-zinc-800/80 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60 text-xs">
              <div className="flex items-center gap-2 text-zinc-100 font-semibold">
                <Users size={16} weight="regular" className="text-zinc-300" />
                <span>Participantes Conectados</span>
              </div>
              <span className="font-mono text-zinc-100 font-bold bg-zinc-850 px-2.5 py-0.5 rounded-md border border-zinc-750 tabular-nums">
                {players.length}
              </span>
            </div>

            {players.length === 0 ? (
              <div className="py-4 text-center space-y-3 my-auto">
                <WaitingRoomIllustration className="w-24 h-18 mx-auto" />
                <p className="text-zinc-300 text-xs font-medium">
                  Aguardando a turma entrar na sala...
                </p>
                <button
                  type="button"
                  onClick={handleAddTestStudents}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
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
                    className="px-3 py-1.5 rounded-xl bg-zinc-850 border border-zinc-750 text-zinc-100 text-xs font-medium flex items-center gap-1.5"
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
                className="min-h-[36px] text-xs text-zinc-300 hover:text-white text-center transition-colors pt-1"
              >
                + Adicionar alunos de teste
              </button>
            )}
          </div>
        </div>

        {/* Botão Iniciar Rodada fixo na base (sempre visível sem precisar rolar) */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-xl mx-auto space-y-1.5 text-center">
            <button
              type="button"
              onClick={handleStartQuiz}
              disabled={players.length === 0}
              className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-display font-extrabold text-base shadow-md transition-all flex items-center justify-center gap-2.5 active:scale-[0.99]"
            >
              <Play size={18} weight="fill" />
              <span>Iniciar Rodada</span>
            </button>
            {/* Oculto em telas pequenas/toque */}
            <span className="hidden lg:block text-xs text-zinc-400">
              Atalhos de teclado: Espaço ou Seta (avançar) · M (som) · F (tela cheia)
            </span>
          </div>
        </div>

        {renderModals()}
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-32 space-y-6 min-h-[82vh] flex flex-col justify-between">
        {renderTopControls(
          <>
            <span className="font-mono font-bold text-zinc-100 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-xl tabular-nums">
              {currentQuestionIndex + 1}/{totalQuestions}
            </span>
            {questionMeta && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-zinc-200 font-medium">
                {QuestionTypeIcon && <QuestionTypeIcon size={14} weight="bold" className="text-amber-400" />}
                <span>{questionMeta.label}</span>
              </span>
            )}
          </>,
          <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-2 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-200 min-h-[44px]">
            <Users size={15} weight="regular" className="text-zinc-300" />
            <span className="text-zinc-100 font-bold tabular-nums">
              {answeredCount}/{players.length}
            </span>
          </div>
        )}

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
                  ? 'border-rose-500 text-rose-300 bg-rose-950/35'
                  : timeLeft <= 10
                  ? 'border-amber-500 text-amber-300 bg-amber-950/35'
                  : 'border-zinc-700 text-zinc-100 bg-zinc-900/60'
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
        <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-200 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Botão "Revelar Resultado" fixo na parte inferior (nunca atrás do header) */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-xl mx-auto">
            <button
              type="button"
              onClick={handleCloseQuestion}
              className={`w-full min-h-[52px] py-3.5 px-6 rounded-2xl font-display font-extrabold text-base shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] ${
                allAnswered
                  ? 'bg-emerald-400 hover:bg-emerald-300 text-zinc-950'
                  : 'bg-amber-400 hover:bg-amber-300 text-zinc-950'
              }`}
            >
              <span>Revelar Resultado</span>
              <ArrowRight size={18} weight="bold" />
            </button>
          </div>
        </div>

        {renderModals()}
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-32 space-y-6 min-h-[82vh] flex flex-col justify-between">
        {renderTopControls(
          <>
            <span className="font-mono font-bold text-zinc-100 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 tabular-nums">
              Resultado {currentQuestionIndex + 1}/{totalQuestions}
            </span>
            {questionMeta && (
              <span className="text-zinc-300 font-medium hidden sm:inline">
                {questionMeta.label}
              </span>
            )}
          </>
        )}

        {/* Question Statement & Answer Highlight */}
        <div className="text-center space-y-3">
          <h2 className="telao-question text-zinc-100 max-w-4xl mx-auto">
            {currentQuestion.question}
          </h2>

          {showTopCorrectBadge && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/45 text-sm sm:text-base font-bold text-emerald-300">
              <CheckCircle size={18} weight="fill" className="text-emerald-400" />
              <span>Gabarito: {currentQuestion.correctAnswer}</span>
            </div>
          )}

          {isOpinion && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs sm:text-sm font-medium text-zinc-200">
              <CheckCircle size={16} weight="fill" className="text-zinc-300" />
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
          <div className="max-w-4xl mx-auto w-full p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-sm sm:text-base text-zinc-200 flex items-start gap-3">
            <Lightbulb size={20} weight="duotone" className="text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{currentQuestion.explanation}</p>
          </div>
        )}

        {/* Minimal Class Analytics */}
        <div className="w-full">
          <DataCloud question={currentQuestion} answers={answers} totalPlayers={players.length} />
        </div>

        {/* Botão dominante "Classificação →" fixo na parte inferior */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-xl mx-auto">
            <button
              type="button"
              onClick={handleShowLeaderboard}
              className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-extrabold text-base shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>Classificação</span>
              <ArrowRight size={18} weight="bold" />
            </button>
          </div>
        </div>

        {renderModals()}
      </div>
    );
  }

  // 4. LEADERBOARD VIEW
  if (session.status === 'leaderboard') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const top5 = sortedPlayers.slice(0, 5);
    const isLastQuestion = currentQuestionIndex + 1 >= totalQuestions;

    return (
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-32 space-y-6 min-h-[82vh] flex flex-col justify-between">
        {renderTopControls(
          <div className="flex items-center gap-3">
            <LeaderboardBadgeIllustration className="w-12 h-12 shrink-0" />
            <div>
              <span className="text-xs text-amber-300 font-medium block">
                Parcial da Rodada · <span className="font-mono">{currentQuestionIndex + 1}/{totalQuestions}</span>
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-zinc-100 font-display">
                Classificação da Turma
              </h2>
            </div>
          </div>
        )}

        {/* Clean Ranking List */}
        <div className="space-y-2.5 my-auto">
          {top5.map((p, idx) => (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                idx === 0
                  ? 'bg-zinc-850 border-zinc-700 shadow-sm'
                  : 'bg-zinc-900/55 border-zinc-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg font-mono text-xs flex items-center justify-center font-bold ${
                    idx === 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-800 text-zinc-200'
                  }`}
                >
                  {idx + 1}
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-100 text-sm">{p.nickname}</h4>
                  {p.streak > 1 && (
                    <span className="text-xs text-amber-300 flex items-center gap-1 font-mono">
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
                <span className="text-xs text-zinc-300 block font-mono">pts</span>
              </div>
            </div>
          ))}
        </div>

        {/* Botão inferior fixo para avançar */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-xl mx-auto">
            <button
              type="button"
              onClick={handleNextStep}
              className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-extrabold text-base shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>{isLastQuestion ? 'Exibir Pódio Final' : 'Próxima Questão'}</span>
              <ArrowRight size={18} weight="bold" />
            </button>
          </div>
        </div>

        {renderModals()}
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
