import React, { useState, useEffect, useRef } from 'react';
import { Session, Quiz, Player } from '../types/quiz';
import {
  findSessionByPin,
  subscribeToSession,
  joinSessionAsPlayer,
  submitAnswer,
  getPlayerById,
  getQuizById,
} from '../services/quizService';
import { STORAGE_KEYS } from '../constants/storage';
import { MULTIPLE_CHOICE_THEMES } from '../constants/quizTheme';
import { soundEffects } from '../lib/soundEffects';
import {
  StepRespondIllustration,
  WaitingRoomIllustration,
  AnswerSentIllustration,
  CorrectAnswerIllustration,
  KeepGoingIllustration,
  TimeUpIllustration,
  OpinionRegisteredIllustration,
  LeaderboardBadgeIllustration,
  PodiumCelebrationIllustration,
} from '../components/BrandIllustrations';
import {
  checkAnswerCorrectness,
  QUESTION_TYPES_META,
  shuffleItems,
  getYouTubeEmbedUrl,
} from '../lib/quizHelpers';
import {
  CheckCircle,
  XCircle,
  ClockCountdown,
  Flame,
  ArrowRight,
  SignOut,
  Crown,
  Confetti,
  WarningCircle,
  ArrowLeft,
  CircleNotch,
  ArrowUp,
  ArrowDown,
  SpeakerHigh,
  ArrowsLeftRight,
  Check,
} from '@phosphor-icons/react';

import { StudentHeaderHud } from '../components/Navbar';

interface StudentViewProps {
  initialPin?: string | null;
  quizzes: Quiz[];
  onBackToDashboard: () => void;
  onHudChange?: (hud: StudentHeaderHud | null) => void;
}

export const StudentView: React.FC<StudentViewProps> = ({
  initialPin,
  quizzes,
  onBackToDashboard,
  onHudChange,
}) => {
  const [pin, setPin] = useState(initialPin || '');
  const [nickname, setNickname] = useState(
    () =>
      localStorage.getItem(STORAGE_KEYS.SAVED_NICKNAME) ||
      localStorage.getItem(STORAGE_KEYS.PLAYER_NICKNAME) ||
      ''
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Active student session state
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [fetchedQuiz, setFetchedQuiz] = useState<Quiz | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [hasAnsweredCurrentQ, setHasAnsweredCurrentQ] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const lastPlayedResultQRef = useRef<number | null>(null);

  // State for interactive formats:
  const [shortAnswerInput, setShortAnswerInput] = useState('');
  const [matchingState, setMatchingState] = useState<Record<string, string>>({});
  const [activePairLeft, setActivePairLeft] = useState<string | null>(null);
  const [shuffledRightOptions, setShuffledRightOptions] = useState<string[]>([]);
  const [orderedItems, setOrderedItems] = useState<string[]>([]);
  const [openEndedInput, setOpenEndedInput] = useState('');
  const [wordCloudInput, setWordCloudInput] = useState('');

  // Keep pin updated if teacher just launched a session or student came from Welcome PIN input
  useEffect(() => {
    if (initialPin) {
      setPin(initialPin);
    }
  }, [initialPin]);

  // Restore saved player session (unless student entered a DIFFERENT initialPin to switch rooms)
  useEffect(() => {
    const savedPin = localStorage.getItem(STORAGE_KEYS.PLAYER_PIN);
    const savedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    const savedNick = localStorage.getItem(STORAGE_KEYS.PLAYER_NICKNAME);

    if (initialPin && savedPin && initialPin !== savedPin) {
      // Student explicitly wants to join a new PIN: clear old session and prefill the new PIN
      localStorage.removeItem(STORAGE_KEYS.PLAYER_PIN);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_ANSWERED_KEY);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_SELECTED_ANSWER);
      setPin(initialPin);
      return;
    }

    if (savedPin && savedPlayerId && savedNick && !activeSession) {
      findSessionByPin(savedPin).then(async (found) => {
        if (found && found.status !== 'finished') {
          setActiveSession(found);
          const existingPlayer = await getPlayerById(found.id, savedPlayerId);
          setPlayer(
            existingPlayer || {
              id: savedPlayerId,
              sessionId: found.id,
              nickname: savedNick,
              score: 0,
              streak: 0,
              joinedAt: new Date().toISOString(),
            }
          );
        } else {
          // Old session is finished: clean up storage so student lands directly on join form
          localStorage.removeItem(STORAGE_KEYS.PLAYER_PIN);
          localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
          localStorage.removeItem(STORAGE_KEYS.PLAYER_ANSWERED_KEY);
          localStorage.removeItem(STORAGE_KEYS.PLAYER_SELECTED_ANSWER);
        }
      });
    }
  }, []);

  // Listen ONLY to the single Session document in real-time (O(1) per student)
  useEffect(() => {
    if (!activeSession?.id) return;
    const unsub = subscribeToSession(activeSession.id, (updated) => {
      if (!updated || updated.status === 'finished') {
        handleLeaveRoom(true);
      } else {
        // Detect if teacher restarted the quiz back to lobby or question 0
        if (
          updated.status === 'lobby' ||
          (updated.currentQuestionIndex === 0 &&
            updated.status === 'question' &&
            updated.questionStartedAt !== activeSession.questionStartedAt &&
            (!updated.rankingSnapshot || updated.rankingSnapshot.length === 0))
        ) {
          localStorage.removeItem(STORAGE_KEYS.PLAYER_ANSWERED_KEY);
          localStorage.removeItem(STORAGE_KEYS.PLAYER_SELECTED_ANSWER);
          setHasAnsweredCurrentQ(false);
          setIsSubmittingAnswer(false);
          setSubmitError(null);
          setSelectedAnswer(null);
          lastPlayedResultQRef.current = null;
          setPlayer((prev) => (prev ? { ...prev, score: 0, streak: 0 } : prev));
        }
        setActiveSession(updated);
      }
    });
    return () => unsub();
  }, [activeSession?.id, activeSession?.questionStartedAt]);

  // If session doesn't have embedded questions and quiz isn't in local prop, fetch by ID
  useEffect(() => {
    if (!activeSession?.quizId) return;
    if (activeSession.questions?.length) return;
    const inProp = quizzes.find((q) => q.id === activeSession.quizId);
    if (inProp) return;
    getQuizById(activeSession.quizId).then((q) => {
      if (q) setFetchedQuiz(q);
    });
  }, [activeSession?.quizId, activeSession?.questions, quizzes]);

  const currentQuiz =
    quizzes.find((q) => q.id === activeSession?.quizId) || fetchedQuiz || quizzes[0];
  const sessionQuestions = activeSession?.questions?.length
    ? activeSession.questions
    : currentQuiz?.questions || [];
  const questionIndex = activeSession?.currentQuestionIndex ?? 0;
  const currentQuestion = sessionQuestions[questionIndex];
  const revealedQuestion =
    activeSession?.revealedQuestion && activeSession.revealedQuestion.id === currentQuestion?.id
      ? activeSession.revealedQuestion
      : currentQuestion;

  // Sync authoritative host-computed score & streak from rankingSnapshot when available
  useEffect(() => {
    if (!player?.id || !activeSession?.rankingSnapshot?.length) return;
    const entry = activeSession.rankingSnapshot.find((p) => p.id === player.id);
    if (entry) {
      setPlayer((prev) =>
        prev
          ? {
              ...prev,
              score: entry.score,
              streak: typeof entry.streak === 'number' ? entry.streak : prev.streak,
            }
          : prev
      );
    }
  }, [activeSession?.rankingSnapshot, player?.id]);

  // Reset or restore interactive inputs when moving to a new question (or restarted round)
  useEffect(() => {
    if (!activeSession?.id) return;
    const roundStamp = activeSession.questionStartedAt || 0;
    const currentKey = `${activeSession.id}_${questionIndex}_${roundStamp}`;
    const savedKey = localStorage.getItem(STORAGE_KEYS.PLAYER_ANSWERED_KEY);
    const savedAnsRaw = localStorage.getItem(STORAGE_KEYS.PLAYER_SELECTED_ANSWER);

    if (savedKey === currentKey && savedAnsRaw) {
      setHasAnsweredCurrentQ(true);
      setIsSubmittingAnswer(false);
      setSubmitError(null);
      try {
        setSelectedAnswer(JSON.parse(savedAnsRaw));
      } catch {
        setSelectedAnswer(savedAnsRaw);
      }
    } else {
      setHasAnsweredCurrentQ(false);
      setIsSubmittingAnswer(false);
      setSubmitError(null);
      setSelectedAnswer(null);
    }

    setShortAnswerInput('');
    setMatchingState({});
    setOpenEndedInput('');
    setWordCloudInput('');

    if (currentQuestion?.type === 'matching' && currentQuestion.pairs) {
      const rightOptions =
        currentQuestion.matchingOptions && currentQuestion.matchingOptions.length > 0
          ? currentQuestion.matchingOptions
          : shuffleItems(currentQuestion.pairs.map((p) => p.right));
      setShuffledRightOptions(rightOptions);
      setActivePairLeft(currentQuestion.pairs[0]?.id || null);
    } else {
      setActivePairLeft(null);
    }

    if (currentQuestion?.type === 'ordering' && currentQuestion.itemsOrder) {
      setOrderedItems(shuffleItems(currentQuestion.itemsOrder));
    }
  }, [
    activeSession?.id,
    activeSession?.currentQuestionIndex,
    activeSession?.questionStartedAt,
    currentQuestion?.id,
  ]);

  // Synchronized countdown timer on student phone
  useEffect(() => {
    if (activeSession?.status !== 'question' || !activeSession.isAcceptingAnswers) return;
    const limitSec = activeSession.timeLimitSeconds || currentQuestion?.timeLimit || 20;
    const startedAt = activeSession.questionStartedAt || Date.now();

    const updateRemaining = () => {
      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, limitSec - elapsedSec);
      setTimeLeft(remaining);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 500);
    return () => clearInterval(interval);
  }, [
    activeSession?.status,
    activeSession?.isAcceptingAnswers,
    activeSession?.questionStartedAt,
    activeSession?.timeLimitSeconds,
    currentQuestion?.timeLimit,
  ]);

  // Sync student HUD (name, remaining time, points) to top contextual Navbar
  useEffect(() => {
    if (!onHudChange) return;
    if (activeSession && player) {
      onHudChange({
        nickname: player.nickname,
        score: player.score,
        timeLeft,
        showTimer: activeSession.status === 'question' && activeSession.isAcceptingAnswers,
      });
    } else {
      onHudChange(null);
    }
  }, [
    onHudChange,
    activeSession?.id,
    activeSession?.status,
    activeSession?.isAcceptingAnswers,
    player?.nickname,
    player?.score,
    timeLeft,
  ]);

  useEffect(() => {
    return () => {
      onHudChange?.(null);
    };
  }, [onHudChange]);

  // Play sound feedback on student phone when result is revealed
  useEffect(() => {
    if (activeSession?.status === 'result' && revealedQuestion) {
      if (lastPlayedResultQRef.current === questionIndex) return;
      lastPlayedResultQRef.current = questionIndex;

      const meta = QUESTION_TYPES_META[revealedQuestion.type];
      if (selectedAnswer !== null && selectedAnswer !== undefined) {
        if (meta?.isOpinion || checkAnswerCorrectness(revealedQuestion, selectedAnswer)) {
          soundEffects.playCorrect();
        } else {
          soundEffects.playIncorrect();
        }
      }
    }
  }, [activeSession?.status, revealedQuestion, questionIndex, selectedAnswer]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPin = pin.trim().replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setErrorMsg('Informe o código PIN de 6 dígitos.');
      return;
    }
    if (!nickname.trim()) {
      setErrorMsg('Informe seu nome para entrar.');
      return;
    }

    setIsJoining(true);
    try {
      const found = await findSessionByPin(cleanPin);
      if (!found) {
        setErrorMsg('Sala não encontrada. Confira o PIN no telão.');
        setIsJoining(false);
        return;
      }

      if (found.status === 'finished') {
        setErrorMsg('Esta apresentação já foi encerrada. Digite o PIN da nova sala.');
        setIsJoining(false);
        return;
      }

      const newPlayer = await joinSessionAsPlayer(found.id, nickname.trim());
      setActiveSession(found);
      setPlayer(newPlayer);

      localStorage.setItem(STORAGE_KEYS.PLAYER_PIN, found.pin);
      localStorage.setItem(STORAGE_KEYS.PLAYER_ID, newPlayer.id);
      localStorage.setItem(STORAGE_KEYS.PLAYER_NICKNAME, newPlayer.nickname);
      localStorage.setItem(STORAGE_KEYS.SAVED_NICKNAME, newPlayer.nickname);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro de conexão. Tente novamente.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = (clearPinInput = true) => {
    localStorage.removeItem(STORAGE_KEYS.PLAYER_PIN);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_NICKNAME);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_ANSWERED_KEY);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_SELECTED_ANSWER);
    setActiveSession(null);
    setPlayer(null);
    setHasAnsweredCurrentQ(false);
    setSelectedAnswer(null);
    setErrorMsg('');
    if (clearPinInput) {
      setPin('');
    }
  };

  const handleSubmitAnswer = async (answerValue: any, isRetry = false) => {
    if (!activeSession || !player || !currentQuestion) return;
    if (hasAnsweredCurrentQ && !isRetry) return;
    if (!activeSession.isAcceptingAnswers) return;

    setSelectedAnswer(answerValue);
    setHasAnsweredCurrentQ(true);
    setIsSubmittingAnswer(true);
    setSubmitError(null);

    const startedAt = activeSession.questionStartedAt || Date.now();
    const timeSpentMs = Math.max(500, Date.now() - startedAt);

    try {
      await submitAnswer(activeSession.id, {
        sessionId: activeSession.id,
        questionIndex,
        playerId: player.id,
        playerNickname: player.nickname,
        answer: answerValue,
        timeSpentMs,
      });

      const roundStamp = activeSession.questionStartedAt || 0;
      localStorage.setItem(
        STORAGE_KEYS.PLAYER_ANSWERED_KEY,
        `${activeSession.id}_${questionIndex}_${roundStamp}`
      );
      localStorage.setItem(STORAGE_KEYS.PLAYER_SELECTED_ANSWER, JSON.stringify(answerValue));
    } catch (err) {
      console.error('Failed to submit answer:', err);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_ANSWERED_KEY);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_SELECTED_ANSWER);
      setSubmitError('Não foi possível enviar sua resposta. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // Reordering helpers
  const moveOrderItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedItems.length) return;
    const updated = [...orderedItems];
    const item = updated.splice(fromIndex, 1)[0];
    updated.splice(toIndex, 0, item);
    setOrderedItems(updated);
  };

  // 1. PIN & NICKNAME LOGIN FORM
  if (!activeSession || !player) {
    return (
      <div className="max-w-sm sm:max-w-md mx-auto px-4 py-6 sm:py-10 space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight font-display">
            Entrar na Rodada
          </h1>
          <p className="text-sm text-zinc-300">
            Informe o PIN projetado no telão e seu nome.
          </p>
        </div>

        <form
          onSubmit={handleJoin}
          className="p-5 sm:p-6 rounded-2xl bg-zinc-900/65 border border-zinc-800 space-y-4"
        >
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/45 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-2.5">
              <WarningCircle size={18} weight="fill" className="text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="student-pin-input" className="text-xs font-medium text-zinc-200">
                PIN da sala
              </label>
              <div className="flex items-center gap-2">
                {pin.length === 6 && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle size={14} weight="fill" />
                    <span>PIN pronto</span>
                  </span>
                )}
                {pin.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPin('')}
                    className="text-xs text-zinc-300 hover:text-white underline underline-offset-2"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
            <input
              id="student-pin-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus={pin.length !== 6}
              className="w-full text-center text-2xl sm:text-3xl font-extrabold font-mono tracking-widest py-3 px-4 rounded-xl bg-zinc-950 border border-zinc-750 text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 transition-colors tabular-nums"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="student-name-input" className="text-xs font-medium text-zinc-200 block">
              Seu nome ou apelido
            </label>
            <input
              id="student-name-input"
              type="text"
              maxLength={30}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Beatriz, Lucas"
              autoFocus={pin.length === 6}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-zinc-950 border border-zinc-750 text-white text-base font-medium placeholder:text-zinc-400 focus:outline-none focus:border-amber-400 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isJoining}
            className="w-full min-h-[52px] py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 font-display font-extrabold text-base shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <span>{isJoining ? 'Conectando...' : 'Participar Agora'}</span>
            <ArrowRight size={18} weight="bold" />
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="min-h-[44px] px-3 text-xs text-zinc-300 hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Voltar ao início</span>
          </button>
        </div>
      </div>
    );
  }

  const renderLeaveConfirmModal = () => {
    if (!showLeaveConfirm) return null;
    return (
      <div
        onClick={() => setShowLeaveConfirm(false)}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
        >
          <h3 className="text-base font-bold text-zinc-100 font-display">
            Sair desta sala?
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Você sairá da rodada atual (PIN {activeSession.pin}) e poderá digitar o PIN de outra sala.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold transition-colors"
            >
              Continuar aqui
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLeaveConfirm(false);
                handleLeaveRoom(true);
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-zinc-950 text-xs font-bold transition-colors"
            >
              Sim, Sair
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 2. LOBBY WAITING ROOM
  if (activeSession.status === 'lobby') {
    return (
      <div className="max-w-sm sm:max-w-md mx-auto px-4 py-8 sm:py-10 space-y-5 text-center">
        <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <WaitingRoomIllustration className="w-24 h-24 mx-auto" />

          <div className="space-y-1">
            <span className="text-xs text-emerald-400 font-semibold inline-flex items-center gap-1.5">
              <CheckCircle size={15} weight="fill" />
              <span>
                Você está na sala · PIN <strong className="font-mono tabular-nums">{activeSession.pin}</strong>
              </span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-display">
              {player.nickname}
            </h2>
            <p className="text-sm text-zinc-300 font-medium pt-0.5">
              {activeSession.quizTitle}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-zinc-300 pt-2 border-t border-zinc-800/70">
            <CircleNotch size={16} weight="bold" className="animate-spin text-amber-400 shrink-0" />
            <span>Olhe para o telão — já vai começar!</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLeaveConfirm(true)}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs text-zinc-300 hover:text-rose-300 inline-flex items-center gap-2 mx-auto transition-colors font-semibold"
        >
          <SignOut size={16} weight="bold" />
          <span>Sair ou Trocar de Sala</span>
        </button>

        {renderLeaveConfirmModal()}
      </div>
    );
  }

  const questionMeta = currentQuestion ? QUESTION_TYPES_META[currentQuestion.type] : null;
  const QuestionIcon = questionMeta?.icon;
  const youtubeEmbedUrl = getYouTubeEmbedUrl(currentQuestion?.mediaUrl);

  // Helper to format the student's chosen answer cleanly on the waiting screen
  const formatChosenAnswerText = (ans: any): string => {
    if (ans === null || ans === undefined) return '';
    if (typeof ans === 'string') return ans;
    if (Array.isArray(ans)) return ans.join(' → ');
    if (typeof ans === 'object') {
      return Object.values(ans).join(', ');
    }
    return String(ans);
  };

  // 3. QUESTION ACTIVE (Interactive Controllers for all 10 formats)
  if (activeSession.status === 'question' && currentQuestion) {
    const limitSec = activeSession.timeLimitSeconds || currentQuestion.timeLimit || 20;
    const remainingPct = Math.min(100, Math.max(0, (timeLeft / limitSec) * 100));
    const timerBarColor =
      timeLeft <= 5
        ? 'bg-rose-500'
        : timeLeft <= 10
        ? 'bg-amber-400'
        : 'bg-emerald-400';

    return (
      <div className="max-w-md mx-auto px-4 py-3 space-y-3 min-h-[calc(100dvh-3.5rem)] flex flex-col justify-between">
        {/* Top Section: Thin Timer Progress Bar + Question Prompt */}
        <div className="space-y-2.5">
          {/* Thin progress bar with remaining seconds alongside */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-zinc-300 font-semibold tabular-nums shrink-0">
              {questionIndex + 1}/{activeSession.totalQuestions}
            </span>
            <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-linear ${timerBarColor}`}
                style={{ width: `${remainingPct}%` }}
              />
            </div>
            <span
              className={`text-xs font-mono font-bold tabular-nums shrink-0 min-w-[2.25rem] text-right ${
                timeLeft <= 5 ? 'text-rose-400' : timeLeft <= 10 ? 'text-amber-300' : 'text-zinc-100'
              }`}
            >
              {timeLeft}s
            </span>
          </div>

          <h2 className="mobile-question text-zinc-100 text-center px-1">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Answer Controls: Interactive per format (placed in lower half within thumb reach) */}
        {hasAnsweredCurrentQ ? (
          <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 text-center space-y-3 my-auto">
            {submitError ? (
              <>
                <div className="inline-flex items-center justify-center gap-2 text-rose-400 font-display font-extrabold text-base sm:text-lg">
                  <WarningCircle size={22} weight="fill" />
                  <span>Falha no envio</span>
                </div>

                {selectedAnswer !== null && selectedAnswer !== undefined && (
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-semibold text-sm sm:text-base break-words">
                    {formatChosenAnswerText(selectedAnswer)}
                  </div>
                )}

                <p className="text-xs text-rose-300">{submitError}</p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSubmitAnswer(selectedAnswer, true)}
                    className="flex-1 min-h-[48px] py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-extrabold text-sm transition-colors"
                  >
                    Reenviar agora
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHasAnsweredCurrentQ(false);
                      setSubmitError(null);
                    }}
                    className="min-h-[48px] py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm transition-colors"
                  >
                    Trocar opção
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center gap-2 text-emerald-400 font-display font-extrabold text-lg">
                  {isSubmittingAnswer ? (
                    <>
                      <CircleNotch size={20} weight="bold" className="animate-spin" />
                      <span>Enviando resposta...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={22} weight="fill" />
                      <span>Resposta enviada ✓</span>
                    </>
                  )}
                </div>

                {selectedAnswer !== null && selectedAnswer !== undefined && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/35 border border-emerald-500/40 text-emerald-100 font-semibold text-sm sm:text-base break-words">
                    {formatChosenAnswerText(selectedAnswer)}
                  </div>
                )}

                <p className="text-xs text-zinc-300">
                  Aguardando o encerramento da rodada...
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 mt-auto pt-1">
            {/* 1. VERDADEIRO OU FALSO */}
            {currentQuestion.type === 'boolean' && (
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSubmitAnswer('Verdadeiro')}
                  className="min-h-[56px] py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-sky-500/40 hover:border-sky-400 text-zinc-100 mobile-option transition-colors flex items-center justify-between"
                >
                  <span className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/35 font-mono text-sm font-bold flex items-center justify-center text-sky-300">
                    V
                  </span>
                  <span>Verdadeiro</span>
                  <div className="w-9" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmitAnswer('Falso')}
                  className="min-h-[56px] py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-rose-500/40 hover:border-rose-400 text-zinc-100 mobile-option transition-colors flex items-center justify-between"
                >
                  <span className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/35 font-mono text-sm font-bold flex items-center justify-center text-rose-300">
                    F
                  </span>
                  <span>Falso</span>
                  <div className="w-9" />
                </button>
              </div>
            )}

            {/* 2. MÚLTIPLA ESCOLHA, IMAGEM, MÍDIA OU ENQUETE */}
            {(currentQuestion.type === 'multiple' ||
              currentQuestion.type === 'image' ||
              currentQuestion.type === 'media' ||
              currentQuestion.type === 'poll') && (
              <div className="space-y-2.5">
                {/* Adaptive Media / Image preview on phone */}
                {currentQuestion.mediaUrl && (
                  <div className="rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                    {currentQuestion.mediaType === 'image' || currentQuestion.type === 'image' ? (
                      <img
                        src={currentQuestion.mediaUrl}
                        alt="Imagem da questão"
                        className="w-full max-h-40 sm:max-h-48 object-contain mx-auto p-1"
                      />
                    ) : currentQuestion.mediaType === 'audio' ? (
                      <div className="p-3 flex items-center gap-3 bg-zinc-900">
                        <SpeakerHigh size={20} weight="duotone" className="text-amber-400 shrink-0" />
                        <audio controls src={currentQuestion.mediaUrl} className="w-full h-9" />
                      </div>
                    ) : youtubeEmbedUrl ? (
                      <div className="aspect-video w-full">
                        <iframe
                          src={youtubeEmbedUrl}
                          title="Vídeo"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <video
                        controls
                        src={currentQuestion.mediaUrl}
                        className="w-full max-h-40 object-contain mx-auto"
                      />
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQuestion.options?.map((opt, i) => {
                    const theme = MULTIPLE_CHOICE_THEMES[i % MULTIPLE_CHOICE_THEMES.length];
                    const IconComp = theme.icon;
                    return (
                      <button
                        type="button"
                        key={i}
                        onClick={() => handleSubmitAnswer(opt)}
                        className={`min-h-[56px] p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 ${theme.hoverBorderClass} text-zinc-100 mobile-option transition-colors flex items-center gap-3 text-left`}
                      >
                        <div className={`w-9 h-9 rounded-lg bg-zinc-950 border ${theme.borderClass} ${theme.textClass} flex items-center justify-center shrink-0`}>
                          <IconComp size={15} weight="fill" />
                        </div>
                        <span className="line-clamp-3 leading-snug">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. RESPOSTA CURTA */}
            {currentQuestion.type === 'short_answer' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (shortAnswerInput.trim()) handleSubmitAnswer(shortAnswerInput.trim());
                }}
                className="space-y-2.5"
              >
                <input
                  type="text"
                  value={shortAnswerInput}
                  onChange={(e) => setShortAnswerInput(e.target.value)}
                  placeholder={currentQuestion.placeholder || 'Digite sua resposta curta...'}
                  className="w-full min-h-[52px] p-3.5 rounded-xl bg-zinc-900 border border-zinc-750 text-white text-base placeholder:text-zinc-400 focus:outline-none focus:border-amber-400 text-center font-semibold"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  disabled={!shortAnswerInput.trim()}
                  className="w-full min-h-[52px] py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-zinc-950 font-display font-extrabold text-base transition-colors"
                >
                  Enviar Resposta
                </button>
              </form>
            )}

            {/* 4. ASSOCIAÇÃO DE PARES */}
            {currentQuestion.type === 'matching' && currentQuestion.pairs && (
              <div className="space-y-3.5">
                <span className="text-xs sm:text-sm text-zinc-300 font-medium block text-center">
                  Toque em um item e escolha seu par correspondente abaixo
                </span>

                <div className="space-y-2.5">
                  {currentQuestion.pairs.map((pair) => {
                    const matchedRight = matchingState[pair.id];
                    const isSelected = activePairLeft === pair.id;

                    return (
                      <div
                        key={pair.id}
                        className={`p-3.5 rounded-2xl border space-y-3 text-sm transition-all ${
                          isSelected
                            ? 'bg-zinc-900 border-zinc-600'
                            : 'bg-zinc-900/60 border-zinc-800/90'
                        }`}
                      >
                        <div
                          onClick={() => setActivePairLeft(isSelected ? null : pair.id)}
                          className="flex items-center justify-between gap-2.5 cursor-pointer"
                        >
                          <span
                            className={`px-3 py-1.5 rounded-xl border font-bold text-sm transition-colors ${
                              isSelected
                                ? 'bg-zinc-100 text-zinc-950 border-white'
                                : 'bg-zinc-850 text-zinc-100 border-zinc-750'
                            }`}
                          >
                            {pair.left}
                          </span>
                          <ArrowsLeftRight size={16} className="text-zinc-400 shrink-0" />
                          <span
                            className={`text-xs sm:text-sm font-medium truncate max-w-[165px] text-right ${
                              matchedRight ? 'text-emerald-400 font-semibold' : 'text-zinc-400'
                            }`}
                          >
                            {matchedRight || 'Selecionar...'}
                          </span>
                        </div>

                        {/* Shuffled Right options picker when this left pair is selected */}
                        {isSelected && (
                          <div className="pt-2.5 border-t border-zinc-800 grid grid-cols-1 gap-2">
                            {shuffledRightOptions.map((rightText, rIdx) => {
                              const isCurrentChoice = matchedRight === rightText;
                              return (
                                <button
                                  key={rIdx}
                                  type="button"
                                  onClick={() => {
                                    const nextState = { ...matchingState, [pair.id]: rightText };
                                    setMatchingState(nextState);
                                    // Auto-advance to next unmatched pair
                                    const nextUnmatched = currentQuestion.pairs?.find(
                                      (p) => p.id !== pair.id && !nextState[p.id]
                                    );
                                    setActivePairLeft(nextUnmatched ? nextUnmatched.id : null);
                                  }}
                                  className={`p-3 rounded-xl border text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-2 transition-colors ${
                                    isCurrentChoice
                                      ? 'bg-emerald-950/45 border-emerald-500/45 text-emerald-200'
                                      : 'bg-zinc-950 border-zinc-800 text-zinc-200 hover:bg-zinc-850'
                                  }`}
                                >
                                  <span className="leading-snug">{rightText}</span>
                                  {isCurrentChoice && <Check size={15} weight="bold" className="text-emerald-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={Object.keys(matchingState).length !== currentQuestion.pairs.length}
                  onClick={() => handleSubmitAnswer(matchingState)}
                  className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-display font-extrabold text-base shadow-sm transition-all active:scale-[0.98]"
                >
                  Confirmar Associações ({Object.keys(matchingState).length}/{currentQuestion.pairs.length})
                </button>
              </div>
            )}

            {/* 5. ORDENAÇÃO OU CLASSIFICAÇÃO */}
            {currentQuestion.type === 'ordering' && (
              <div className="space-y-3.5">
                <span className="text-xs sm:text-sm text-zinc-300 font-medium block text-center">
                  Use as setas para ordenar os itens na sequência correta
                </span>

                <div className="space-y-2.5">
                  {orderedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-zinc-800 font-mono text-zinc-200 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}º
                        </span>
                        <span className="text-zinc-100 font-semibold leading-snug text-sm sm:text-base">
                          {item}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveOrderItem(idx, idx - 1)}
                          className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 disabled:opacity-25 text-zinc-100 transition-colors active:scale-95"
                          aria-label="Mover para cima"
                        >
                          <ArrowUp size={16} weight="bold" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === orderedItems.length - 1}
                          onClick={() => moveOrderItem(idx, idx + 1)}
                          className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 disabled:opacity-25 text-zinc-100 transition-colors active:scale-95"
                          aria-label="Mover para baixo"
                        >
                          <ArrowDown size={16} weight="bold" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleSubmitAnswer(orderedItems)}
                  className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-display font-extrabold text-base shadow-sm transition-all active:scale-[0.98]"
                >
                  Confirmar Sequência
                </button>
              </div>
            )}

            {/* 8. NUVEM DE PALAVRAS */}
            {currentQuestion.type === 'word_cloud' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (wordCloudInput.trim()) handleSubmitAnswer(wordCloudInput.trim());
                }}
                className="space-y-3"
              >
                <input
                  type="text"
                  maxLength={35}
                  value={wordCloudInput}
                  onChange={(e) => setWordCloudInput(e.target.value)}
                  placeholder={currentQuestion.placeholder || 'Digite 1 ou 2 palavras...'}
                  className="w-full min-h-[52px] p-3.5 rounded-xl bg-zinc-900 border border-zinc-750 text-white text-base placeholder:text-zinc-400 focus:outline-none focus:border-amber-400 text-center font-semibold"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  disabled={!wordCloudInput.trim()}
                  className="w-full min-h-[52px] py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-zinc-950 font-display font-extrabold text-base transition-colors"
                >
                  Enviar para a Nuvem
                </button>
              </form>
            )}

            {/* 10. RESPOSTA ABERTA OU DISCURSIVA */}
            {currentQuestion.type === 'open_ended' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (openEndedInput.trim()) handleSubmitAnswer(openEndedInput.trim());
                }}
                className="space-y-3"
              >
                <textarea
                  rows={4}
                  maxLength={300}
                  value={openEndedInput}
                  onChange={(e) => setOpenEndedInput(e.target.value)}
                  placeholder={currentQuestion.placeholder || 'Escreva sua reflexão ou justificativa...'}
                  className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-750 text-white text-base placeholder:text-zinc-400 focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                  autoFocus
                  required
                />
                <div className="flex items-center justify-between text-xs text-zinc-300 font-medium">
                  <span>Resposta discursiva</span>
                  <span className="font-mono tabular-nums">{openEndedInput.length}/300</span>
                </div>
                <button
                  type="submit"
                  disabled={!openEndedInput.trim()}
                  className="w-full min-h-[52px] py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-zinc-950 font-display font-extrabold text-base transition-colors"
                >
                  Enviar Reflexão
                </button>
              </form>
            )}
          </div>
        )}

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setShowLeaveConfirm(true)}
            className="min-h-[44px] px-4 py-2 text-xs text-zinc-300 hover:text-white inline-flex items-center gap-1.5 transition-colors"
          >
            <SignOut size={14} weight="bold" />
            <span>Sair da sala</span>
          </button>
        </div>

        {renderLeaveConfirmModal()}
      </div>
    );
  }

  // 4. ROUND RESULT VIEW
  if (activeSession.status === 'result' && revealedQuestion) {
    const isOpinionType = Boolean(questionMeta?.isOpinion);
    const isCorrect = checkAnswerCorrectness(revealedQuestion, selectedAnswer);

    return (
      <div className="max-w-sm sm:max-w-md mx-auto px-4 py-8 space-y-5 text-center">
        {/* Top bar with PIN and quick exit */}
        <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
          <span>PIN {activeSession.pin}</span>
          <button
            type="button"
            onClick={() => setShowLeaveConfirm(true)}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-zinc-100 font-sans font-semibold transition-colors"
          >
            <ArrowsLeftRight size={14} weight="bold" />
            <span>Trocar Sala</span>
          </button>
        </div>

        {selectedAnswer ? (
          <div
            className={`border rounded-3xl p-6 sm:p-7 space-y-3.5 ${
              isOpinionType
                ? 'bg-zinc-900/65 border-zinc-750 text-zinc-100'
                : isCorrect
                ? 'bg-emerald-950/30 border-emerald-500/45 text-emerald-200'
                : 'bg-rose-950/30 border-rose-500/45 text-rose-200'
            }`}
          >
            {isOpinionType ? (
              <OpinionRegisteredIllustration className="w-24 h-24 mx-auto" />
            ) : isCorrect ? (
              <CorrectAnswerIllustration className="w-24 h-24 mx-auto" />
            ) : (
              <KeepGoingIllustration className="w-24 h-24 mx-auto" />
            )}

            <h2 className="text-xl font-extrabold text-zinc-100 font-display">
              {isOpinionType
                ? 'Contribuição Registrada'
                : isCorrect
                ? 'Mandou Bem! Resposta Correta'
                : 'Quase lá! Continue Focado'}
            </h2>

            {revealedQuestion.correctAnswer && !isOpinionType && (
              <p className="text-sm text-zinc-300 leading-relaxed">
                Gabarito: <strong className="text-zinc-100">"{revealedQuestion.correctAnswer}"</strong>
              </p>
            )}

            {!revealedQuestion.correctAnswer && !isOpinionType && (
              <p className="text-sm text-zinc-300 leading-relaxed">
                Confira o gabarito completo projetado no telão.
              </p>
            )}
          </div>
        ) : (
          <div className="p-7 rounded-3xl bg-zinc-900/60 border border-zinc-800/90 space-y-3">
            <TimeUpIllustration className="w-24 h-24 mx-auto" />
            <h3 className="text-xl font-extrabold text-zinc-100 font-display">Tempo Esgotado</h3>
            <p className="text-sm text-zinc-300">Nenhuma resposta enviada nesta questão.</p>
          </div>
        )}

        {/* Current Score Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 flex items-center justify-between">
          <div className="text-left">
            <span className="text-xs text-zinc-300 block font-medium">Pontuação Total</span>
            <span className="text-2xl font-bold text-zinc-100 font-mono tabular-nums">
              {player.score} pts
            </span>
          </div>

          {player.streak > 0 && !isOpinionType && (
            <div className="text-right flex items-center gap-1.5 text-amber-400 font-bold text-sm font-mono">
              <Flame size={16} weight="fill" />
              <span>{player.streak} seguidas</span>
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-300">
          Aguardando a próxima etapa no telão...
        </p>

        {renderLeaveConfirmModal()}
      </div>
    );
  }

  // 5. LEADERBOARD OR PODIUM VIEW
  if (activeSession.status === 'leaderboard' || activeSession.status === 'podium') {
    const ranking = activeSession.rankingSnapshot || [];
    const myRank = ranking.findIndex((p) => p.id === player.id) + 1;
    const mySnapshotScore = ranking.find((p) => p.id === player.id)?.score ?? player.score;

    return (
      <div className="max-w-sm sm:max-w-md mx-auto px-4 py-8 space-y-5 text-center">
        {/* Top bar with PIN and quick exit */}
        <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
          <span>PIN {activeSession.pin}</span>
          <button
            type="button"
            onClick={() =>
              activeSession.status === 'podium' ? handleLeaveRoom(true) : setShowLeaveConfirm(true)
            }
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-zinc-100 font-sans font-semibold transition-colors"
          >
            <ArrowsLeftRight size={14} weight="bold" />
            <span>Trocar Sala</span>
          </button>
        </div>

        <div className="p-7 rounded-3xl bg-zinc-900/60 border border-zinc-800/90 space-y-3.5 shadow-lg shadow-black/20">
          {activeSession.status === 'podium' || myRank === 1 ? (
            <PodiumCelebrationIllustration className="w-28 h-24 mx-auto" />
          ) : (
            <LeaderboardBadgeIllustration className="w-24 h-24 mx-auto" />
          )}

          <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-850 border border-zinc-750 text-base font-bold font-mono text-zinc-100 mx-auto">
            {myRank === 1 && <Crown size={18} weight="fill" className="text-amber-400" />}
            <span>#{myRank > 0 ? `${myRank}º lugar` : '-'}</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-300 block">
              {activeSession.status === 'podium' ? 'Resultado Final' : 'Classificação Parcial'}
            </span>
            <h3 className="text-xl font-extrabold text-zinc-100 font-display">
              {myRank === 1
                ? '1º Lugar da Turma!'
                : myRank > 0
                ? `${myRank}ª Posição na Sala`
                : player.nickname}
            </h3>
            <span className="text-sm text-zinc-200 font-mono tabular-nums block">
              {mySnapshotScore} pontos acumulados
            </span>
          </div>
        </div>

        {activeSession.status === 'podium' ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleLeaveRoom(true)}
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-sky-400 hover:bg-sky-300 text-zinc-950 font-display font-extrabold text-sm transition-all shadow-md shadow-sky-500/15"
            >
              <ArrowsLeftRight size={16} weight="bold" />
              <span>Entrar em Outro Quiz</span>
            </button>
            <button
              type="button"
              onClick={() => handleLeaveRoom(false)}
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 text-sm font-semibold transition-colors"
            >
              <SignOut size={16} weight="bold" />
              <span>Sair da Sala</span>
            </button>
          </div>
        ) : (
          <p className="text-xs text-zinc-300">
            Se o professor reiniciar ou avançar, sua tela atualizará sozinha.
          </p>
        )}

        {renderLeaveConfirmModal()}
      </div>
    );
  }

  return null;
};
