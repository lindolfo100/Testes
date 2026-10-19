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

interface StudentViewProps {
  initialPin?: string | null;
  quizzes: Quiz[];
  onBackToDashboard: () => void;
}

export const StudentView: React.FC<StudentViewProps> = ({
  initialPin,
  quizzes,
  onBackToDashboard,
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
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(20);
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

  // Reset or restore interactive inputs when moving to a new question (or restarted round)
  useEffect(() => {
    if (!activeSession?.id) return;
    const roundStamp = activeSession.questionStartedAt || 0;
    const currentKey = `${activeSession.id}_${questionIndex}_${roundStamp}`;
    const savedKey = localStorage.getItem(STORAGE_KEYS.PLAYER_ANSWERED_KEY);
    const savedAnsRaw = localStorage.getItem(STORAGE_KEYS.PLAYER_SELECTED_ANSWER);

    if (savedKey === currentKey && savedAnsRaw) {
      setHasAnsweredCurrentQ(true);
      try {
        setSelectedAnswer(JSON.parse(savedAnsRaw));
      } catch {
        setSelectedAnswer(savedAnsRaw);
      }
    } else {
      setHasAnsweredCurrentQ(false);
      setSelectedAnswer(null);
    }

    setShortAnswerInput('');
    setMatchingState({});
    setOpenEndedInput('');
    setWordCloudInput('');

    if (currentQuestion?.type === 'matching' && currentQuestion.pairs) {
      setShuffledRightOptions(shuffleItems(currentQuestion.pairs.map((p) => p.right)));
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

  // Play sound feedback on student phone when result is revealed
  useEffect(() => {
    if (activeSession?.status === 'result' && currentQuestion) {
      if (lastPlayedResultQRef.current === questionIndex) return;
      lastPlayedResultQRef.current = questionIndex;

      const meta = QUESTION_TYPES_META[currentQuestion.type];
      if (selectedAnswer !== null && selectedAnswer !== undefined) {
        if (meta?.isOpinion || checkAnswerCorrectness(currentQuestion, selectedAnswer)) {
          soundEffects.playCorrect();
        } else {
          soundEffects.playIncorrect();
        }
      }
    }
  }, [activeSession?.status, currentQuestion, questionIndex, selectedAnswer]);

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

  const handleSubmitAnswer = async (answerValue: any) => {
    if (!activeSession || !player || !currentQuestion || hasAnsweredCurrentQ) return;
    if (!activeSession.isAcceptingAnswers) return;

    setSelectedAnswer(answerValue);
    setHasAnsweredCurrentQ(true);
    const roundStamp = activeSession.questionStartedAt || 0;
    localStorage.setItem(
      STORAGE_KEYS.PLAYER_ANSWERED_KEY,
      `${activeSession.id}_${questionIndex}_${roundStamp}`
    );
    localStorage.setItem(STORAGE_KEYS.PLAYER_SELECTED_ANSWER, JSON.stringify(answerValue));

    const isCorrect = checkAnswerCorrectness(currentQuestion, answerValue);
    const startedAt = activeSession.questionStartedAt || Date.now();
    const timeSpentMs = Math.max(500, Date.now() - startedAt);

    const basePoints = currentQuestion.points ?? 1000;
    const timeLimitMs = (activeSession.timeLimitSeconds || 20) * 1000;
    const speedRatio = Math.max(0.2, Math.min(1, (timeLimitMs - timeSpentMs) / timeLimitMs));
    const pointsAwarded = isCorrect && basePoints > 0 ? Math.round(basePoints * (0.6 + 0.4 * speedRatio)) : 0;

    // Optimistic local update so the student phone needs zero live listeners on players collection
    const optimisticScore = player.score + (isCorrect ? pointsAwarded : 0);
    const optimisticStreak = isCorrect ? player.streak + 1 : 0;
    setPlayer((prev) =>
      prev ? { ...prev, score: optimisticScore, streak: optimisticStreak } : prev
    );

    try {
      const updatedStats = await submitAnswer(
        activeSession.id,
        {
          sessionId: activeSession.id,
          questionIndex,
          playerId: player.id,
          playerNickname: player.nickname,
          answer: answerValue,
          isCorrect,
          pointsAwarded,
          timeSpentMs,
        },
        player.score,
        player.streak
      );
      if (updatedStats) {
        setPlayer((prev) =>
          prev ? { ...prev, score: updatedStats.score, streak: updatedStats.streak } : prev
        );
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
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
      <div className="max-w-sm sm:max-w-md mx-auto px-4 py-8 sm:py-10 space-y-6">
        <div className="text-center space-y-2.5">
          <StepRespondIllustration className="w-24 h-24 mx-auto" />
          <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-semibold block">
            Modo Participante
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight font-display">
            Entrar na Rodada
          </h1>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Digite o PIN projetado no telão ou escaneie o QR Code
          </p>
        </div>

        <form
          onSubmit={handleJoin}
          className="p-6 sm:p-7 rounded-3xl bg-zinc-900/60 border border-zinc-800/90 space-y-5 shadow-lg shadow-black/20"
        >
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/45 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-2.5">
              <WarningCircle size={18} weight="fill" className="text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold">
                PIN da Sala
              </label>
              <div className="flex items-center gap-2">
                {pin.length === 6 && (
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle size={14} weight="fill" />
                    <span>PIN identificado</span>
                  </span>
                )}
                {pin.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPin('')}
                    className="text-xs font-mono text-zinc-400 hover:text-zinc-200 underline underline-offset-2"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus={pin.length !== 6}
              className="w-full text-center text-3xl sm:text-4xl font-black font-mono tracking-widest py-3.5 px-4 rounded-2xl bg-zinc-950 border border-zinc-750 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/70 transition-colors tabular-nums"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold block">
              Seu Nome ou Apelido
            </label>
            <input
              type="text"
              maxLength={30}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Beatriz, Lucas"
              autoFocus={pin.length === 6}
              className="w-full py-3.5 px-4 rounded-2xl bg-zinc-950 border border-zinc-750 text-white text-base font-medium placeholder:text-zinc-500 focus:outline-none focus:border-amber-400/70 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isJoining}
            className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 font-display font-extrabold text-base shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>{isJoining ? 'Conectando...' : 'Participar Agora'}</span>
            <ArrowRight size={18} weight="bold" />
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={onBackToDashboard}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors inline-flex items-center gap-1.5 py-1"
          >
            <ArrowLeft size={15} weight="bold" />
            <span>Ir para a tela inicial</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. LOBBY WAITING ROOM
  if (activeSession.status === 'lobby') {
    return (
      <div className="max-w-sm sm:max-w-md mx-auto px-4 py-8 sm:py-10 space-y-5 text-center">
        <div className="flex items-center justify-between text-xs bg-zinc-900/65 px-4 py-2.5 rounded-2xl border border-zinc-800/90">
          <span className="font-mono text-zinc-300 font-semibold">
            Sala <strong className="text-emerald-400">#{activeSession.pin}</strong>
          </span>
          <button
            type="button"
            onClick={() => handleLeaveRoom(true)}
            className="text-zinc-300 hover:text-rose-400 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowsLeftRight size={14} weight="bold" />
            <span>Trocar Sala / Sair</span>
          </button>
        </div>

        <div className="p-7 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800/90 space-y-5 shadow-lg shadow-black/20">
          <WaitingRoomIllustration className="w-28 h-28 mx-auto" />

          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-mono font-semibold inline-flex items-center gap-1.5">
              <CheckCircle size={15} weight="fill" />
              <span>Você está na sala!</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-display">
              {player.nickname}
            </h2>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-sm sm:text-base text-zinc-200 font-semibold">
            {activeSession.quizTitle}
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-zinc-300 pt-1">
            <CircleNotch size={16} weight="bold" className="animate-spin text-amber-400 shrink-0" />
            <span>Olhe para o telão — já vai começar!</span>
          </div>
        </div>

        <button
          onClick={() => handleLeaveRoom(true)}
          className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-sm text-zinc-300 hover:text-rose-300 inline-flex items-center gap-2 mx-auto transition-colors font-semibold"
        >
          <SignOut size={16} weight="bold" />
          <span>Sair ou Entrar em Outro Quiz</span>
        </button>
      </div>
    );
  }

  const questionMeta = currentQuestion ? QUESTION_TYPES_META[currentQuestion.type] : null;
  const QuestionIcon = questionMeta?.icon;
  const youtubeEmbedUrl = getYouTubeEmbedUrl(currentQuestion?.mediaUrl);

  // 3. QUESTION ACTIVE (Interactive Controllers for all 10 formats)
  if (activeSession.status === 'question' && currentQuestion) {
    return (
      <div className="max-w-md mx-auto px-4 py-4 space-y-4 min-h-[82vh] flex flex-col justify-between">
        {/* Top Info Bar with Synchronized Timer & Quick Room Switch */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-300 bg-zinc-900/65 px-3.5 py-2.5 rounded-2xl border border-zinc-800/90 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-zinc-100 truncate max-w-[115px]">{player.nickname}</span>
            <span className="text-[11px] font-mono text-zinc-400 hidden xs:inline">
              #{activeSession.pin}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2.5 py-1 rounded-lg border font-mono font-bold tabular-nums flex items-center gap-1 ${
                timeLeft <= 5
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 animate-pulse'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-100'
              }`}
            >
              <ClockCountdown size={14} weight="bold" />
              <span>{timeLeft}s</span>
            </span>
            {player.streak > 1 && (
              <span className="text-amber-400 flex items-center gap-1 font-mono font-bold">
                <Flame size={14} weight="fill" /> {player.streak}x
              </span>
            )}
            <span className="font-mono font-bold text-zinc-100 tabular-nums">{player.score} pts</span>
            <button
              type="button"
              onClick={() => handleLeaveRoom(true)}
              className="p-1.5 rounded-lg bg-zinc-950 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-rose-300 transition-colors"
              title="Sair da sala ou entrar em outro quiz"
            >
              <SignOut size={14} weight="bold" />
            </button>
          </div>
        </div>

        {/* Question Prompt */}
        <div className="text-center space-y-2.5 py-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 font-medium">
            <span>
              {questionIndex + 1}/{activeSession.totalQuestions}
            </span>
            {questionMeta && (
              <>
                <span>·</span>
                {QuestionIcon && <QuestionIcon size={13} weight="bold" />}
                <span>{questionMeta.shortLabel}</span>
              </>
            )}
          </div>
          <h2 className="mobile-question text-zinc-100 px-1">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Answer Controls: Interactive per format */}
        {hasAnsweredCurrentQ ? (
          <div className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800/90 text-center space-y-3.5 my-auto shadow-lg shadow-black/20">
            <AnswerSentIllustration className="w-24 h-24 mx-auto" />
            <h3 className="text-xl font-extrabold text-zinc-100 font-display">Resposta Enviada!</h3>
            <p className="text-sm text-zinc-300 max-w-xs mx-auto leading-relaxed">
              Sua participação foi registrada. Acompanhe a revelação do resultado no telão.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {/* 1. VERDADEIRO OU FALSO */}
            {currentQuestion.type === 'boolean' && (
              <div className="grid grid-cols-1 gap-3.5">
                <button
                  onClick={() => handleSubmitAnswer('Verdadeiro')}
                  className="py-5 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 active:scale-[0.98] border border-sky-500/35 hover:border-sky-500/65 text-zinc-100 mobile-option shadow-sm transition-all flex items-center justify-between"
                >
                  <span className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/35 font-mono text-base font-bold flex items-center justify-center text-sky-400">
                    V
                  </span>
                  <span>Verdadeiro</span>
                  <div className="w-10" />
                </button>

                <button
                  onClick={() => handleSubmitAnswer('Falso')}
                  className="py-5 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 active:scale-[0.98] border border-rose-500/35 hover:border-rose-500/65 text-zinc-100 mobile-option shadow-sm transition-all flex items-center justify-between"
                >
                  <span className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/35 font-mono text-base font-bold flex items-center justify-center text-rose-400">
                    F
                  </span>
                  <span>Falso</span>
                  <div className="w-10" />
                </button>
              </div>
            )}

            {/* 2. MÚLTIPLA ESCOLHA, IMAGEM, MÍDIA OU ENQUETE */}
            {(currentQuestion.type === 'multiple' ||
              currentQuestion.type === 'image' ||
              currentQuestion.type === 'media' ||
              currentQuestion.type === 'poll') && (
              <div className="space-y-3.5">
                {/* Adaptive Media / Image preview on phone */}
                {currentQuestion.mediaUrl && (
                  <div className="illustration-frame rounded-2xl overflow-hidden bg-zinc-950/90">
                    {currentQuestion.mediaType === 'image' || currentQuestion.type === 'image' ? (
                      <img
                        src={currentQuestion.mediaUrl}
                        alt="Imagem da questão"
                        className="w-full max-h-52 sm:max-h-60 object-contain mx-auto p-1.5"
                      />
                    ) : currentQuestion.mediaType === 'audio' ? (
                      <div className="p-3.5 flex items-center gap-3 bg-zinc-900/70">
                        <SpeakerHigh size={22} weight="duotone" className="text-amber-400 shrink-0" />
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
                        className="w-full max-h-52 object-contain mx-auto"
                      />
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options?.map((opt, i) => {
                    const theme = MULTIPLE_CHOICE_THEMES[i % MULTIPLE_CHOICE_THEMES.length];
                    const IconComp = theme.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSubmitAnswer(opt)}
                        className={`p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 active:scale-[0.98] border border-zinc-800 ${theme.hoverBorderClass} text-zinc-100 mobile-option shadow-sm transition-all flex items-center gap-3.5 text-left`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-zinc-950 border ${theme.borderClass} ${theme.textClass} flex items-center justify-center shrink-0`}>
                          <IconComp size={16} weight="fill" />
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
                className="space-y-3.5"
              >
                <input
                  type="text"
                  value={shortAnswerInput}
                  onChange={(e) => setShortAnswerInput(e.target.value)}
                  placeholder={currentQuestion.placeholder || 'Digite sua resposta curta...'}
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-750 text-white text-base placeholder:text-zinc-500 focus:outline-none focus:border-amber-400/70 text-center font-semibold"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  disabled={!shortAnswerInput.trim()}
                  className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-display font-extrabold text-base shadow-sm transition-all active:scale-[0.98]"
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
                className="space-y-3.5"
              >
                <input
                  type="text"
                  maxLength={35}
                  value={wordCloudInput}
                  onChange={(e) => setWordCloudInput(e.target.value)}
                  placeholder={currentQuestion.placeholder || 'Digite 1 ou 2 palavras...'}
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-750 text-white text-base placeholder:text-zinc-500 focus:outline-none focus:border-amber-400/70 text-center font-semibold"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  disabled={!wordCloudInput.trim()}
                  className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-display font-extrabold text-base shadow-sm transition-all active:scale-[0.98]"
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
                className="space-y-3.5"
              >
                <textarea
                  rows={4}
                  maxLength={300}
                  value={openEndedInput}
                  onChange={(e) => setOpenEndedInput(e.target.value)}
                  placeholder={currentQuestion.placeholder || 'Escreva sua reflexão ou justificativa...'}
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-750 text-white text-base placeholder:text-zinc-500 focus:outline-none focus:border-amber-400/70 leading-relaxed font-sans"
                  autoFocus
                  required
                />
                <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                  <span>Resposta discursiva</span>
                  <span>{openEndedInput.length}/300</span>
                </div>
                <button
                  type="submit"
                  disabled={!openEndedInput.trim()}
                  className="w-full py-4 rounded-2xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-display font-extrabold text-base shadow-sm transition-all active:scale-[0.98]"
                >
                  Enviar Reflexão
                </button>
              </form>
            )}
          </div>
        )}

        <div className="text-center text-xs text-zinc-400 font-mono">
          Acompanhe o cronômetro no telão da sala
        </div>
      </div>
    );
  }

  // 4. ROUND RESULT VIEW
  if (activeSession.status === 'result' && currentQuestion) {
    const isOpinionType = Boolean(questionMeta?.isOpinion);
    const isCorrect = checkAnswerCorrectness(currentQuestion, selectedAnswer);

    return (
      <div className="max-w-sm sm:max-w-md mx-auto px-4 py-8 space-y-5 text-center">
        {/* Top bar with PIN and quick exit */}
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>PIN {activeSession.pin}</span>
          <button
            type="button"
            onClick={() => handleLeaveRoom(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            <ArrowsLeftRight size={13} weight="bold" />
            Trocar Sala
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

            {currentQuestion.correctAnswer && !isOpinionType && (
              <p className="text-sm text-zinc-300 leading-relaxed">
                Gabarito: <strong className="text-zinc-100">"{currentQuestion.correctAnswer}"</strong>
              </p>
            )}

            {!currentQuestion.correctAnswer && !isOpinionType && (
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
            <span className="text-xs text-zinc-400 block font-mono uppercase">Pontuação Total</span>
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

        <p className="text-xs text-zinc-400 font-mono">
          Aguardando a próxima etapa no telão...
        </p>
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
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>PIN {activeSession.pin}</span>
          <button
            type="button"
            onClick={() => handleLeaveRoom(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            <ArrowsLeftRight size={13} weight="bold" />
            Trocar Sala
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
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 block">
              {activeSession.status === 'podium' ? 'Resultado Final' : 'Classificação Parcial'}
            </span>
            <h3 className="text-xl font-extrabold text-zinc-100 font-display">
              {myRank === 1
                ? '1º Lugar da Turma!'
                : myRank > 0
                ? `${myRank}ª Posição na Sala`
                : player.nickname}
            </h3>
            <span className="text-sm text-zinc-300 font-mono tabular-nums block">
              {mySnapshotScore} pontos acumulados
            </span>
          </div>
        </div>

        {activeSession.status === 'podium' ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleLeaveRoom(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-sky-400 hover:bg-sky-300 text-zinc-950 font-display font-extrabold text-sm transition-all shadow-md shadow-sky-500/15"
            >
              <ArrowsLeftRight size={16} weight="bold" />
              Entrar em Outro Quiz
            </button>
            <button
              type="button"
              onClick={() => handleLeaveRoom(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-200 text-sm font-semibold transition-colors"
            >
              <SignOut size={16} weight="bold" />
              Sair da Sala
            </button>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 font-mono">
            Se o professor reiniciar ou avançar, sua tela atualizará sozinha.
          </p>
        )}
      </div>
    );
  }

  return null;
};
