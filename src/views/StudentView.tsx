import React, { useState, useEffect } from 'react';
import { Session, Quiz, Player } from '../types/quiz';
import {
  findSessionByPin,
  subscribeToSession,
  joinSessionAsPlayer,
  submitAnswer,
  subscribeToPlayers,
} from '../services/quizService';
import { STORAGE_KEYS } from '../constants/storage';
import { MULTIPLE_CHOICE_THEMES } from '../constants/quizTheme';
import {
  StepRespondIllustration,
  WaitingRoomIllustration,
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
  const [nickname, setNickname] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Active student session state
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [hasAnsweredCurrentQ, setHasAnsweredCurrentQ] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);

  // State for interactive formats:
  const [shortAnswerInput, setShortAnswerInput] = useState('');
  const [matchingState, setMatchingState] = useState<Record<string, string>>({});
  const [activePairLeft, setActivePairLeft] = useState<string | null>(null);
  const [shuffledRightOptions, setShuffledRightOptions] = useState<string[]>([]);
  const [orderedItems, setOrderedItems] = useState<string[]>([]);
  const [openEndedInput, setOpenEndedInput] = useState('');
  const [wordCloudInput, setWordCloudInput] = useState('');

  // Keep pin updated if teacher just launched a session
  useEffect(() => {
    if (initialPin && !pin) {
      setPin(initialPin);
    }
  }, [initialPin]);

  // Restore saved player session
  useEffect(() => {
    const savedPin = localStorage.getItem(STORAGE_KEYS.PLAYER_PIN);
    const savedPlayerId = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    const savedNick = localStorage.getItem(STORAGE_KEYS.PLAYER_NICKNAME);

    if (savedPin && savedPlayerId && savedNick && !activeSession) {
      findSessionByPin(savedPin).then((found) => {
        if (found && found.status !== 'finished') {
          setActiveSession(found);
          setPlayer({
            id: savedPlayerId,
            sessionId: found.id,
            nickname: savedNick,
            score: 0,
            streak: 0,
            joinedAt: new Date().toISOString(),
          });
        }
      });
    }
  }, []);

  // Listen to Session updates in real-time
  useEffect(() => {
    if (!activeSession?.id) return;
    const unsub = subscribeToSession(activeSession.id, (updated) => {
      if (!updated || updated.status === 'finished') {
        handleLeaveRoom();
      } else {
        setActiveSession(updated);
      }
    });
    return () => unsub();
  }, [activeSession?.id]);

  // Listen to players
  useEffect(() => {
    if (!activeSession?.id || !player?.id) return;
    const unsub = subscribeToPlayers(activeSession.id, (players) => {
      setAllPlayers(players);
      const me = players.find((p) => p.id === player.id);
      if (me) {
        setPlayer(me);
      }
    });
    return () => unsub();
  }, [activeSession?.id, player?.id]);

  const currentQuiz = quizzes.find((q) => q.id === activeSession?.quizId) || quizzes[0];
  const questionIndex = activeSession?.currentQuestionIndex ?? 0;
  const currentQuestion = currentQuiz?.questions[questionIndex];

  // Reset interactive inputs when moving to a new question
  useEffect(() => {
    setHasAnsweredCurrentQ(false);
    setSelectedAnswer(null);
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
  }, [activeSession?.currentQuestionIndex, currentQuestion?.id]);

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
        setErrorMsg('Esta apresentação já foi encerrada.');
        setIsJoining(false);
        return;
      }

      const newPlayer = await joinSessionAsPlayer(found.id, nickname.trim());
      setActiveSession(found);
      setPlayer(newPlayer);

      localStorage.setItem(STORAGE_KEYS.PLAYER_PIN, found.pin);
      localStorage.setItem(STORAGE_KEYS.PLAYER_ID, newPlayer.id);
      localStorage.setItem(STORAGE_KEYS.PLAYER_NICKNAME, newPlayer.nickname);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro de conexão. Tente novamente.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem(STORAGE_KEYS.PLAYER_PIN);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
    localStorage.removeItem(STORAGE_KEYS.PLAYER_NICKNAME);
    setActiveSession(null);
    setPlayer(null);
    setHasAnsweredCurrentQ(false);
    setSelectedAnswer(null);
  };

  const handleSubmitAnswer = async (answerValue: any) => {
    if (!activeSession || !player || !currentQuestion || hasAnsweredCurrentQ) return;
    if (!activeSession.isAcceptingAnswers) return;

    setSelectedAnswer(answerValue);
    setHasAnsweredCurrentQ(true);

    const isCorrect = checkAnswerCorrectness(currentQuestion, answerValue);
    const startedAt = activeSession.questionStartedAt || Date.now();
    const timeSpentMs = Math.max(500, Date.now() - startedAt);

    const basePoints = currentQuestion.points ?? 1000;
    const timeLimitMs = (activeSession.timeLimitSeconds || 20) * 1000;
    const speedRatio = Math.max(0.2, Math.min(1, (timeLimitMs - timeSpentMs) / timeLimitMs));
    const pointsAwarded = isCorrect && basePoints > 0 ? Math.round(basePoints * (0.6 + 0.4 * speedRatio)) : 0;

    try {
      await submitAnswer(
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
      <div className="max-w-xs sm:max-w-sm mx-auto px-4 py-10 space-y-5">
        <div className="text-center space-y-2">
          <StepRespondIllustration className="w-20 h-20 mx-auto" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-semibold block">
            Modo Participante
          </span>
          <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight font-display">
            Entrar na Rodada
          </h1>
          <p className="text-xs text-zinc-400">
            Digite o PIN projetado no telão ou escaneie o QR Code
          </p>
        </div>

        <form
          onSubmit={handleJoin}
          className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 space-y-4 shadow-sm"
        >
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <WarningCircle size={15} weight="fill" className="text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                PIN da Sala
              </label>
              {pin.length === 6 && (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle size={12} weight="fill" />
                  <span>PIN identificado</span>
                </span>
              )}
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus={pin.length !== 6}
              className="w-full text-center text-3xl font-black font-mono tracking-widest py-3 px-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-400/60 transition-colors tabular-nums"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
              Seu Nome ou Apelido
            </label>
            <input
              type="text"
              maxLength={30}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Beatriz, Lucas"
              autoFocus={pin.length === 6}
              className="w-full py-3 px-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-white text-sm font-medium placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/60 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isJoining}
            className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 font-extrabold text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>{isJoining ? 'Conectando...' : 'Participar Agora'}</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={onBackToDashboard}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={13} weight="bold" />
            <span>Ir para o painel do professor</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. LOBBY WAITING ROOM
  if (activeSession.status === 'lobby') {
    return (
      <div className="max-w-xs sm:max-w-sm mx-auto px-4 py-12 space-y-6 text-center">
        <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 space-y-4 shadow-sm">
          <WaitingRoomIllustration className="w-24 h-24 mx-auto" />

          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-mono font-semibold inline-flex items-center gap-1">
              <CheckCircle size={13} weight="fill" />
              <span>Você está na sala!</span>
            </span>
            <h2 className="text-2xl font-extrabold text-zinc-100 font-display">{player.nickname}</h2>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 font-medium">
            {activeSession.quizTitle}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 pt-1">
            <CircleNotch size={14} weight="bold" className="animate-spin text-amber-400" />
            <span>Olhe para o telão — já vai começar!</span>
          </div>
        </div>

        <button
          onClick={handleLeaveRoom}
          className="text-xs text-zinc-500 hover:text-rose-400 flex items-center gap-1.5 mx-auto transition-colors"
        >
          <SignOut size={14} weight="bold" />
          <span>Sair da sala</span>
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
        {/* Top Info Bar */}
        <div className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/50 px-3.5 py-2.5 rounded-xl border border-zinc-800/80">
          <span className="font-semibold text-zinc-200 truncate max-w-[160px]">{player.nickname}</span>
          <div className="flex items-center gap-3 shrink-0">
            {player.streak > 1 && (
              <span className="text-amber-400 flex items-center gap-1 font-mono font-bold">
                <Flame size={13} weight="fill" /> {player.streak}x
              </span>
            )}
            <span className="font-mono font-bold text-zinc-100 tabular-nums">{player.score} pts</span>
          </div>
        </div>

        {/* Question Prompt */}
        <div className="text-center space-y-2 py-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <span>
              {questionIndex + 1}/{activeSession.totalQuestions}
            </span>
            {questionMeta && (
              <>
                <span>·</span>
                {QuestionIcon && <QuestionIcon size={12} weight="bold" />}
                <span>{questionMeta.shortLabel}</span>
              </>
            )}
          </div>
          <h2 className="mobile-question text-zinc-100">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Answer Controls: Interactive per format */}
        {hasAnsweredCurrentQ ? (
          <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 text-center space-y-3 my-auto shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle size={28} weight="fill" className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-extrabold text-zinc-100 font-display">Resposta Enviada!</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Sua participação foi registrada. Acompanhe a revelação do resultado no telão.
            </p>
          </div>
        ) : (
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {/* 1. VERDADEIRO OU FALSO */}
            {currentQuestion.type === 'boolean' && (
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => handleSubmitAnswer('Verdadeiro')}
                  className="py-5 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 active:scale-[0.98] border border-sky-500/30 hover:border-sky-500/60 text-zinc-100 mobile-option shadow-sm transition-all flex items-center justify-between"
                >
                  <span className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 font-mono text-sm font-bold flex items-center justify-center text-sky-400">
                    V
                  </span>
                  <span>Verdadeiro</span>
                  <div className="w-9" />
                </button>

                <button
                  onClick={() => handleSubmitAnswer('Falso')}
                  className="py-5 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 active:scale-[0.98] border border-rose-500/30 hover:border-rose-500/60 text-zinc-100 mobile-option shadow-sm transition-all flex items-center justify-between"
                >
                  <span className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 font-mono text-sm font-bold flex items-center justify-center text-rose-400">
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
              <div className="space-y-3">
                {/* Media preview on phone */}
                {currentQuestion.mediaUrl && (
                  <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                    {currentQuestion.mediaType === 'image' || currentQuestion.type === 'image' ? (
                      <img
                        src={currentQuestion.mediaUrl}
                        alt="Estímulo"
                        className="w-full max-h-40 object-cover"
                      />
                    ) : currentQuestion.mediaType === 'audio' ? (
                      <div className="p-3 flex items-center gap-2.5 bg-zinc-900/60">
                        <SpeakerHigh size={20} weight="duotone" className="text-zinc-300 shrink-0" />
                        <audio controls src={currentQuestion.mediaUrl} className="w-full h-8" />
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
                      <video controls src={currentQuestion.mediaUrl} className="w-full max-h-40 object-cover" />
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
                        className={`p-4 rounded-2xl bg-zinc-900 hover:bg-zinc-850 active:scale-[0.98] border border-zinc-800 hover:${theme.borderClass} text-zinc-100 mobile-option shadow-sm transition-all flex items-center gap-3.5 text-left`}
                      >
                        <div className={`w-9 h-9 rounded-xl bg-zinc-950 border ${theme.borderClass} ${theme.textClass} flex items-center justify-center shrink-0`}>
                          <IconComp size={15} weight="fill" />
                        </div>
                        <span className="line-clamp-2">{opt}</span>
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
                className="space-y-3"
              >
                <input
                  type="text"
                  value={shortAnswerInput}
                  onChange={(e) => setShortAnswerInput(e.target.value)}
                  placeholder={currentQuestion.placeholder || 'Digite sua resposta curta...'}
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 text-center font-medium"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  disabled={!shortAnswerInput.trim()}
                  className="w-full py-3.5 rounded-2xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
                >
                  Enviar Resposta
                </button>
              </form>
            )}

            {/* 4. ASSOCIAÇÃO DE PARES */}
            {currentQuestion.type === 'matching' && currentQuestion.pairs && (
              <div className="space-y-3">
                <span className="text-[11px] text-zinc-400 font-mono block text-center">
                  Selecione um conceito e escolha sua correspondência abaixo
                </span>

                <div className="space-y-2">
                  {currentQuestion.pairs.map((pair) => {
                    const matchedRight = matchingState[pair.id];
                    const isSelected = activePairLeft === pair.id;

                    return (
                      <div
                        key={pair.id}
                        className={`p-3 rounded-xl border space-y-2.5 text-xs transition-all ${
                          isSelected
                            ? 'bg-zinc-900 border-zinc-600'
                            : 'bg-zinc-900/50 border-zinc-800/80'
                        }`}
                      >
                        <div
                          onClick={() => setActivePairLeft(isSelected ? null : pair.id)}
                          className="flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span
                            className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                              isSelected
                                ? 'bg-zinc-100 text-zinc-950 border-white'
                                : 'bg-zinc-850 text-zinc-100 border-zinc-750'
                            }`}
                          >
                            {pair.left}
                          </span>
                          <ArrowsLeftRight size={14} className="text-zinc-500 shrink-0" />
                          <span
                            className={`text-[11px] font-medium truncate max-w-[150px] text-right ${
                              matchedRight ? 'text-emerald-400 font-semibold' : 'text-zinc-500'
                            }`}
                          >
                            {matchedRight || 'Selecionar...'}
                          </span>
                        </div>

                        {/* Shuffled Right options picker when this left pair is selected */}
                        {isSelected && (
                          <div className="pt-2 border-t border-zinc-800 grid grid-cols-1 gap-1.5">
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
                                  className={`p-2.5 rounded-lg border text-left text-[11px] font-medium flex items-center justify-between transition-colors ${
                                    isCurrentChoice
                                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-850'
                                  }`}
                                >
                                  <span>{rightText}</span>
                                  {isCurrentChoice && <Check size={12} weight="bold" className="text-emerald-400 shrink-0" />}
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
                  className="w-full py-3.5 rounded-2xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
                >
                  Confirmar Associações ({Object.keys(matchingState).length}/{currentQuestion.pairs.length})
                </button>
              </div>
            )}

            {/* 5. ORDENAÇÃO OU CLASSIFICAÇÃO */}
            {currentQuestion.type === 'ordering' && (
              <div className="space-y-3">
                <span className="text-[11px] text-zinc-400 font-mono block text-center">
                  Use as setas para ordenar os itens na sequência correta
                </span>

                <div className="space-y-2">
                  {orderedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 font-mono text-zinc-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}º
                        </span>
                        <span className="text-zinc-100 font-medium leading-snug">{item}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveOrderItem(idx, idx - 1)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 disabled:opacity-25 text-zinc-200 transition-colors"
                        >
                          <ArrowUp size={14} weight="bold" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === orderedItems.length - 1}
                          onClick={() => moveOrderItem(idx, idx + 1)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 disabled:opacity-25 text-zinc-200 transition-colors"
                        >
                          <ArrowDown size={14} weight="bold" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleSubmitAnswer(orderedItems)}
                  className="w-full py-3.5 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
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
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 text-center font-semibold"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  disabled={!wordCloudInput.trim()}
                  className="w-full py-3.5 rounded-2xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
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
                  className="w-full p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-xs sm:text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 leading-relaxed font-sans"
                  autoFocus
                  required
                />
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>Resposta discursiva</span>
                  <span>{openEndedInput.length}/300</span>
                </div>
                <button
                  type="submit"
                  disabled={!openEndedInput.trim()}
                  className="w-full py-3.5 rounded-2xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
                >
                  Enviar Reflexão
                </button>
              </form>
            )}
          </div>
        )}

        <div className="text-center text-[10px] text-zinc-500 font-mono">
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
      <div className="max-w-xs sm:max-w-sm mx-auto px-4 py-10 space-y-4 text-center">
        {selectedAnswer ? (
          <div
            className={`border rounded-3xl p-6 space-y-3 ${
              isOpinionType
                ? 'bg-zinc-900/60 border-zinc-750 text-zinc-100'
                : isCorrect
                ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/25 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto bg-zinc-900/80 border border-zinc-800">
              {isOpinionType ? (
                <CheckCircle size={28} weight="fill" className="text-emerald-400" />
              ) : isCorrect ? (
                <Confetti size={28} weight="duotone" className="text-emerald-400" />
              ) : (
                <XCircle size={28} weight="fill" className="text-rose-400" />
              )}
            </div>

            <h2 className="text-lg font-bold text-zinc-100">
              {isOpinionType
                ? 'Contribuição Registrada'
                : isCorrect
                ? 'Resposta Correta!'
                : 'Resposta Incorreta'}
            </h2>

            {currentQuestion.correctAnswer && !isOpinionType && (
              <p className="text-xs text-zinc-400 leading-relaxed">
                Gabarito: <strong className="text-zinc-100">"{currentQuestion.correctAnswer}"</strong>
              </p>
            )}

            {!currentQuestion.correctAnswer && !isOpinionType && (
              <p className="text-xs text-zinc-400 leading-relaxed">
                Confira o gabarito completo projetado no telão.
              </p>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 space-y-2">
            <ClockCountdown size={28} weight="duotone" className="text-amber-400 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-100">Tempo Esgotado</h3>
            <p className="text-xs text-zinc-400">Nenhuma resposta enviada nesta questão.</p>
          </div>
        )}

        {/* Current Score Card */}
        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[11px] text-zinc-500 block font-mono uppercase">Pontuação Total</span>
            <span className="text-xl font-bold text-zinc-100 font-mono tabular-nums">
              {player.score} pts
            </span>
          </div>

          {player.streak > 0 && !isOpinionType && (
            <div className="text-right flex items-center gap-1 text-amber-400 font-bold text-xs font-mono">
              <Flame size={15} weight="fill" />
              <span>{player.streak} seguidas</span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-zinc-500 font-mono">
          Aguardando a próxima etapa no telão...
        </p>
      </div>
    );
  }

  // 5. LEADERBOARD OR PODIUM VIEW
  if (activeSession.status === 'leaderboard' || activeSession.status === 'podium') {
    const sorted = [...allPlayers].sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex((p) => p.id === player.id) + 1;

    return (
      <div className="max-w-xs sm:max-w-sm mx-auto px-4 py-10 space-y-5 text-center">
        <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-zinc-850 border border-zinc-750 flex items-center justify-center mx-auto text-lg font-bold font-mono text-zinc-100">
            {myRank === 1 ? (
              <Crown size={24} weight="fill" className="text-amber-400" />
            ) : (
              `#${myRank > 0 ? myRank : '-'}`
            )}
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 block mb-0.5">
              {activeSession.status === 'podium' ? 'Resultado Final' : 'Classificação Parcial'}
            </span>
            <h3 className="text-base font-bold text-zinc-100">
              {myRank === 1 ? '1º Lugar da Turma' : `${myRank}ª Posição`}
            </h3>
            <span className="text-xs text-zinc-400 font-mono tabular-nums">
              {player.score} pontos acumulados
            </span>
          </div>
        </div>

        {activeSession.status === 'podium' && (
          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
          >
            Concluir e Sair da Sala
          </button>
        )}
      </div>
    );
  }

  return null;
};
