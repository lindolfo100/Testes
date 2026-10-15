import React, { useState, useEffect } from 'react';
import { Session, Quiz, Player, Answer, Question } from '../types/quiz';
import {
  findSessionByPin,
  subscribeToSession,
  joinSessionAsPlayer,
  submitAnswer,
  subscribeToPlayers,
} from '../services/quizService';
import {
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  Flame,
  Award,
  Sparkles,
  ArrowRight,
  LogOut,
} from 'lucide-react';

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
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);

  // Restore saved player session from localStorage if available
  useEffect(() => {
    const savedPin = localStorage.getItem('quiz_player_pin');
    const savedPlayerId = localStorage.getItem('quiz_player_id');
    const savedNick = localStorage.getItem('quiz_player_nick');

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
      if (!updated) {
        handleLeaveRoom();
      } else {
        setActiveSession(updated);
      }
    });
    return () => unsub();
  }, [activeSession?.id]);

  // Listen to players to update my own score in real-time
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

  // Reset answered status when moving to a new question
  useEffect(() => {
    setHasAnsweredCurrentQ(false);
    setSelectedAnswer(null);
  }, [activeSession?.currentQuestionIndex]);

  // Handle Joining with PIN
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!pin.trim() || pin.trim().length !== 6) {
      setErrorMsg('O código PIN deve conter exatamente 6 números.');
      return;
    }
    if (!nickname.trim()) {
      setErrorMsg('Por favor, informe seu apelido ou nome.');
      return;
    }

    setIsJoining(true);
    try {
      const found = await findSessionByPin(pin.trim());
      if (!found) {
        setErrorMsg('Sala não encontrada com este PIN. Verifique o telão do professor.');
        setIsJoining(false);
        return;
      }

      if (found.status === 'finished') {
        setErrorMsg('Esta sessão já foi finalizada pelo professor.');
        setIsJoining(false);
        return;
      }

      const newPlayer = await joinSessionAsPlayer(found.id, nickname.trim());
      setActiveSession(found);
      setPlayer(newPlayer);

      // Save to localStorage
      localStorage.setItem('quiz_player_pin', found.pin);
      localStorage.setItem('quiz_player_id', newPlayer.id);
      localStorage.setItem('quiz_player_nick', newPlayer.nickname);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao conectar à sala. Tente novamente.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem('quiz_player_pin');
    localStorage.removeItem('quiz_player_id');
    localStorage.removeItem('quiz_player_nick');
    setActiveSession(null);
    setPlayer(null);
    setHasAnsweredCurrentQ(false);
    setSelectedAnswer(null);
  };

  // Find question data
  const currentQuiz = quizzes.find((q) => q.id === activeSession?.quizId) || quizzes[0];
  const questionIndex = activeSession?.currentQuestionIndex ?? 0;
  const currentQuestion = currentQuiz?.questions[questionIndex];

  // Submit Answer
  const handleSelectAnswer = async (answerText: string) => {
    if (!activeSession || !player || !currentQuestion || hasAnsweredCurrentQ) return;
    if (!activeSession.isAcceptingAnswers) return;

    setSelectedAnswer(answerText);
    setHasAnsweredCurrentQ(true);

    const isCorrect = answerText === currentQuestion.correctAnswer;
    const startedAt = activeSession.questionStartedAt || Date.now();
    const timeSpentMs = Math.max(500, Date.now() - startedAt);

    // Calculate dynamic points (faster answers earn more bonus)
    const basePoints = currentQuestion.points || 1000;
    const timeLimitMs = (activeSession.timeLimitSeconds || 20) * 1000;
    const speedRatio = Math.max(0.2, (timeLimitMs - timeSpentMs) / timeLimitMs);
    const pointsAwarded = isCorrect ? Math.round(basePoints * (0.6 + 0.4 * speedRatio)) : 0;

    try {
      await submitAnswer(
        activeSession.id,
        {
          sessionId: activeSession.id,
          questionIndex,
          playerId: player.id,
          playerNickname: player.nickname,
          answer: answerText,
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

  // 1. PIN & NICKNAME LOGIN FORM
  if (!activeSession || !player) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
            <Smartphone className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Entrar no Quiz</h1>
          <p className="text-xs text-slate-400">
            Digite o código PIN exibido no telão da sala e seu apelido
          </p>
        </div>

        <form onSubmit={handleJoin} className="bg-slate-850 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-semibold text-center">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Código PIN da Sala
            </label>
            <input
              type="text"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full text-center text-3xl font-black font-mono tracking-widest py-3 px-4 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Seu Apelido / Nome
            </label>
            <input
              type="text"
              maxLength={30}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Lucas, Sofia, Equipe A"
              className="w-full py-3 px-4 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isJoining}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>{isJoining ? 'Conectando...' : 'Entrar na Sala'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={onBackToDashboard}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            ← Voltar para o Painel do Professor
          </button>
        </div>
      </div>
    );
  }

  // 2. LOBBY WAITING ROOM
  if (activeSession.status === 'lobby') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 space-y-8 text-center">
        <div className="bg-slate-850 border border-slate-700/80 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-2xl animate-pulse">
            ✓
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              Você está na sala!
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{player.nickname}</h2>
          </div>

          <div className="py-4 px-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
            <span className="text-indigo-400 font-bold block">{activeSession.quizTitle}</span>
            <p className="text-slate-400">
              Olhe para o telão! O quiz começará assim que o professor clicar em Iniciar.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Aguardando início...</span>
          </div>
        </div>

        <button
          onClick={handleLeaveRoom}
          className="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1 mx-auto transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair da Sala</span>
        </button>
      </div>
    );
  }

  // 3. QUESTION ACTIVE (ANSWERING CONSOLE)
  if (activeSession.status === 'question' && currentQuestion) {
    return (
      <div className="max-w-md mx-auto px-4 py-6 space-y-5 min-h-[80vh] flex flex-col justify-between">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-850 px-4 py-2.5 rounded-xl border border-slate-700">
          <span className="font-semibold">{player.nickname}</span>
          <div className="flex items-center gap-3">
            {player.streak > 1 && (
              <span className="text-amber-400 flex items-center gap-1 font-mono font-bold">
                <Flame className="w-3.5 h-3.5" /> {player.streak}x
              </span>
            )}
            <span className="font-mono font-bold text-white tabular-nums">{player.score} pts</span>
          </div>
        </div>

        {/* Question Header & Statement */}
        <div className="text-center space-y-2 py-2">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
            Pergunta {questionIndex + 1} de {activeSession.totalQuestions}
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Answer Buttons or Locked State */}
        {hasAnsweredCurrentQ ? (
          <div className="bg-slate-850 border border-slate-700 rounded-3xl p-8 text-center space-y-4 shadow-xl my-auto">
            <div className="w-14 h-14 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center mx-auto text-xl">
              👍
            </div>
            <h3 className="text-xl font-bold text-white">Resposta Registrada!</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Sua escolha foi <strong>"{selectedAnswer}"</strong>. Aguarde a revelação do gabarito no telão da sala.
            </p>
          </div>
        ) : (
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {currentQuestion.type === 'boolean' ? (
              // VERDADEIRO OU FALSO (2 Big Buttons)
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => handleSelectAnswer('Verdadeiro')}
                  className="py-6 px-6 rounded-2xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-black text-xl shadow-lg transition-transform flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-mono">V</span>
                    <span>Verdadeiro</span>
                  </div>
                  <CheckCircle className="w-6 h-6" />
                </button>

                <button
                  onClick={() => handleSelectAnswer('Falso')}
                  className="py-6 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xl shadow-lg transition-transform flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-mono">F</span>
                    <span>Falso</span>
                  </div>
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            ) : (
              // MULTIPLE CHOICE (4 Big Colored Tiles)
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((opt, i) => {
                  const colors = [
                    'bg-rose-600 hover:bg-rose-500',
                    'bg-sky-600 hover:bg-sky-500',
                    'bg-amber-600 hover:bg-amber-500',
                    'bg-emerald-600 hover:bg-emerald-500',
                  ];
                  const symbols = ['▲', '◆', '●', '■'];
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectAnswer(opt)}
                      className={`p-4 rounded-2xl ${colors[i % colors.length]} active:scale-95 text-white font-bold text-sm sm:text-base shadow-md transition-transform flex items-center gap-3 text-left`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center font-bold text-sm shrink-0">
                        {symbols[i % symbols.length]}
                      </span>
                      <span className="line-clamp-2 leading-tight">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="text-center text-[11px] text-slate-500">
          Atenção ao cronômetro do telão!
        </div>
      </div>
    );
  }

  // 4. ROUND RESULT VIEW
  if (activeSession.status === 'result' && currentQuestion) {
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-6 text-center">
        {selectedAnswer ? (
          <div
            className={`border rounded-3xl p-8 shadow-2xl space-y-4 ${
              isCorrect
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500 text-rose-200'
            }`}
          >
            <div className="text-5xl">{isCorrect ? '🎉' : '❌'}</div>
            <h2 className="text-2xl font-extrabold text-white">
              {isCorrect ? 'Resposta Correta!' : 'Resposta Incorreta!'}
            </h2>
            <p className="text-xs opacity-90">
              Gabarito oficial: <strong>{currentQuestion.correctAnswer}</strong>
            </p>
          </div>
        ) : (
          <div className="bg-slate-850 border border-slate-700 rounded-3xl p-8 space-y-3">
            <div className="text-3xl">⏰</div>
            <h3 className="text-lg font-bold text-white">Tempo Esgotado!</h3>
            <p className="text-xs text-slate-400">Você não respondeu a tempo nesta rodada.</p>
          </div>
        )}

        {/* Current Score Card */}
        <div className="bg-slate-850 border border-slate-700/80 rounded-2xl p-5 flex items-center justify-between">
          <div className="text-left">
            <span className="text-xs text-slate-400 block font-semibold">Sua Pontuação Total</span>
            <span className="text-2xl font-black text-white font-mono tabular-nums">
              {player.score} pts
            </span>
          </div>

          {player.streak > 0 && (
            <div className="text-right flex items-center gap-1.5 text-amber-400 font-bold text-sm">
              <Flame className="w-5 h-5" />
              <span>{player.streak} seguidas!</span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400">
          Aguardando o professor avançar para a próxima pergunta...
        </p>
      </div>
    );
  }

  // 5. LEADERBOARD OR PODIUM VIEW
  if (activeSession.status === 'leaderboard' || activeSession.status === 'podium') {
    const sorted = [...allPlayers].sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex((p) => p.id === player.id) + 1;

    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-6 text-center">
        <div className="bg-slate-850 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto text-2xl font-extrabold font-mono">
            #{myRank > 0 ? myRank : '-'}
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">
              {myRank === 1 ? 'Você está em 1º Lugar! 👑' : `Você está na ${myRank}ª posição`}
            </h3>
            <span className="text-xs text-slate-400">
              Total acumulado: {player.score} pontos
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          {activeSession.status === 'podium'
            ? 'Quiz encerrado! Confira o pódio no telão!'
            : 'Aguardando o professor continuar...'}
        </p>

        {activeSession.status === 'podium' && (
          <button
            onClick={handleLeaveRoom}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Sair da Sala
          </button>
        )}
      </div>
    );
  }

  return null;
};
