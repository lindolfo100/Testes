import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  increment,
  Timestamp,
  limit,
  query,
  where,
  onSnapshot,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, resolveCurrentUid } from '../lib/firebase';
import { Quiz, Question, Session, Player, Answer } from '../types/quiz';
import { SAMPLE_QUIZZES } from '../data/sampleQuizzes';
import { sanitizeQuestionsForPublicSession } from '../lib/quizHelpers';

// Generate 6-digit PIN
export function generateRoomPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// QUIZ OPERATIONS
export async function getTeacherQuizzes(userId: string): Promise<Quiz[]> {
  try {
    const q = query(collection(db, 'quizzes'), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    const userQuizzes: Quiz[] = [];
    snapshot.forEach((docSnap) => {
      userQuizzes.push({ id: docSnap.id, ...(docSnap.data() as Omit<Quiz, 'id'>) });
    });

    // Always include sample quizzes as available templates
    const all = [...SAMPLE_QUIZZES, ...userQuizzes];
    return all;
  } catch (error) {
    console.warn('Could not fetch custom quizzes from Firestore, falling back to samples:', error);
    return SAMPLE_QUIZZES;
  }
}

export async function getQuizById(quizId: string): Promise<Quiz | null> {
  const sample = SAMPLE_QUIZZES.find((q) => q.id === quizId);
  if (sample) return sample;

  try {
    const snap = await getDoc(doc(db, 'quizzes', quizId));
    if (snap.exists()) {
      return { id: snap.id, ...(snap.data() as Omit<Quiz, 'id'>) };
    }
  } catch (error) {
    console.warn('Could not fetch quiz by ID:', error);
  }
  return null;
}

export async function createQuiz(quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const quizId = 'quiz_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  const path = `quizzes/${quizId}`;
  const resolvedOwnerId = quiz.ownerId && quiz.ownerId !== 'guest' ? quiz.ownerId : resolveCurrentUid();

  const payload: Quiz = {
    ...quiz,
    id: quizId,
    ownerId: resolvedOwnerId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'quizzes', quizId), payload);
    return quizId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateQuiz(quizId: string, updates: Partial<Quiz>): Promise<void> {
  const path = `quizzes/${quizId}`;
  try {
    const docRef = doc(db, 'quizzes', quizId);
    const snap = await getDoc(docRef);
    const currentUid = updates.ownerId && updates.ownerId !== 'guest' ? updates.ownerId : resolveCurrentUid();

    // If the quiz does not exist in Firestore, or if it is a system template, create as new personal quiz
    if (!snap.exists() || snap.data()?.ownerId === 'system') {
      const newPayload: Quiz = {
        title: updates.title || 'Meu Quiz',
        description: updates.description || '',
        subject: updates.subject || 'Ciências',
        isPublic: false,
        questions: updates.questions || [],
        ...updates,
        id: quizId,
        ownerId: currentUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, newPayload);
      return;
    }

    // Document exists and belongs to teacher: update it
    await updateDoc(docRef, {
      ...updates,
      ownerId: snap.data().ownerId, // keep authentic ownerId
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const path = `quizzes/${quizId}`;
  try {
    await deleteDoc(doc(db, 'quizzes', quizId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// SESSION OPERATIONS
export async function createLiveSession(quiz: Quiz, hostId: string, hostName: string): Promise<Session> {
  const sessionId = 'ses_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  let pin = generateRoomPin();
  // Avoid PIN collision with any currently active session
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const existing = await findSessionByPin(pin);
      if (!existing || existing.status === 'finished') break;
      pin = generateRoomPin();
    } catch {
      break;
    }
  }
  const now = new Date().toISOString();
  const expiresAtMs = Date.now() + 24 * 60 * 60 * 1000;
  const expiresAtIso = new Date(expiresAtMs).toISOString();
  const expiresAtTimestamp = Timestamp.fromMillis(expiresAtMs);
  const path = `sessions/${sessionId}`;

  const firstQuestionTime = quiz.questions[0]?.timeLimit || 20;
  const sanitizedQuestions = sanitizeQuestionsForPublicSession(quiz.questions);

  const sessionData: Session = {
    id: sessionId,
    pin,
    hostId,
    hostName: hostName || 'Professor(a)',
    quizId: quiz.id,
    quizTitle: quiz.title,
    questions: sanitizedQuestions,
    status: 'lobby',
    currentQuestionIndex: 0,
    totalQuestions: quiz.questions.length,
    isAcceptingAnswers: false,
    timeLimitSeconds: firstQuestionTime,
    revealedQuestion: null,
    createdAt: now,
    expiresAt: expiresAtIso,
    expiresAtTimestamp,
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'sessions', sessionId), sessionData);
    // Store full unredacted questions in private host-only subcollection
    batch.set(doc(db, 'sessions', sessionId, 'private', 'config'), {
      hostId,
      questions: quiz.questions,
      createdAt: now,
      expiresAt: expiresAtIso,
      expiresAtTimestamp,
    });
    await batch.commit();
    return sessionData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getSessionPrivateQuestions(sessionId: string): Promise<Question[] | null> {
  try {
    const snap = await getDoc(doc(db, 'sessions', sessionId, 'private', 'config'));
    if (snap.exists() && Array.isArray(snap.data()?.questions)) {
      return snap.data().questions as Question[];
    }
  } catch (error) {
    console.warn('Could not fetch private session questions:', error);
  }
  return null;
}

export async function findSessionByPin(pin: string): Promise<Session | null> {
  const path = 'sessions';
  try {
    const q = query(collection(db, 'sessions'), where('pin', '==', pin.trim()), limit(5));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    // Prefer an active (non-finished) session if multiple share the same PIN
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Session, 'id'>) }));
    return docs.find((s) => s.status !== 'finished') || docs[0];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToSession(
  sessionId: string,
  onUpdate: (session: Session | null) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = `sessions/${sessionId}`;
  return onSnapshot(
    doc(db, 'sessions', sessionId),
    (docSnap) => {
      if (!docSnap.exists()) {
        onUpdate(null);
      } else {
        onUpdate({ id: docSnap.id, ...(docSnap.data() as Omit<Session, 'id'>) });
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function updateSessionState(
  sessionId: string,
  updates: Partial<Session>
): Promise<void> {
  const path = `sessions/${sessionId}`;
  try {
    await updateDoc(doc(db, 'sessions', sessionId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// PLAYER OPERATIONS
export async function joinSessionAsPlayer(
  sessionId: string,
  nickname: string,
  existingPlayerId?: string
): Promise<Player> {
  const playerId =
    existingPlayerId || 'ply_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const path = `sessions/${sessionId}/players/${playerId}`;

  const playerData: Player = {
    id: playerId,
    sessionId,
    uid: resolveCurrentUid(),
    nickname: nickname.trim().substring(0, 40),
    score: 0,
    streak: 0,
    joinedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'sessions', sessionId, 'players', playerId), playerData);
    return playerData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getPlayerById(
  sessionId: string,
  playerId: string
): Promise<Player | null> {
  const path = `sessions/${sessionId}/players/${playerId}`;
  try {
    const snap = await getDoc(doc(db, 'sessions', sessionId, 'players', playerId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Player, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToPlayers(
  sessionId: string,
  onUpdate: (players: Player[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = `sessions/${sessionId}/players`;
  const q = query(collection(db, 'sessions', sessionId, 'players'), orderBy('score', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const players: Player[] = [];
      snapshot.forEach((d) => {
        players.push({ id: d.id, ...(d.data() as Omit<Player, 'id'>) });
      });
      onUpdate(players);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ANSWER OPERATIONS
export async function submitAnswer(
  sessionId: string,
  answer: Pick<Answer, 'sessionId' | 'questionIndex' | 'playerId' | 'playerNickname' | 'answer' | 'timeSpentMs'>
): Promise<void> {
  // Deterministic ID prevents duplicate submissions for the same question by the same player
  const answerId = `ans_${answer.playerId}_q_${answer.questionIndex}`;
  const now = new Date().toISOString();

  // Student submits ungraded answer; the host (TelaoView) evaluates correctness and awards points
  const answerPayload: Answer = {
    ...answer,
    id: answerId,
    isCorrect: false,
    pointsAwarded: 0,
    gradedByHost: false,
    submittedAt: now,
  };

  const answerRef = doc(db, 'sessions', sessionId, 'answers', answerId);

  try {
    await setDoc(answerRef, answerPayload);
  } catch (err) {
    // Only treat as graceful duplicate if the answer document actually exists in Firestore
    try {
      const existingSnap = await getDoc(answerRef);
      if (existingSnap.exists()) {
        return;
      }
    } catch {
      // Ignore secondary read failure and rethrow original submission error
    }
    throw err;
  }
}

/**
 * Executed by the session host (TelaoView) using the private answer key and host clock
 * to grade a submitted answer and atomically update the player's official score and streak.
 */
export async function gradeAnswerAsHost(
  sessionId: string,
  answerId: string,
  playerId: string,
  isCorrect: boolean,
  pointsAwarded: number,
  timeSpentMs: number
): Promise<void> {
  const answerRef = doc(db, 'sessions', sessionId, 'answers', answerId);
  const playerRef = doc(db, 'sessions', sessionId, 'players', playerId);

  const batch = writeBatch(db);
  batch.update(answerRef, {
    isCorrect,
    pointsAwarded,
    timeSpentMs,
    gradedByHost: true,
  });
  batch.update(playerRef, {
    score: increment(isCorrect ? pointsAwarded : 0),
    streak: isCorrect ? increment(1) : 0,
    lastAnswerId: answerId,
  });
  await batch.commit();
}

export function subscribeToAnswers(
  sessionId: string,
  questionIndex: number,
  onUpdate: (answers: Answer[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const path = `sessions/${sessionId}/answers`;
  const q = query(
    collection(db, 'sessions', sessionId, 'answers'),
    where('questionIndex', '==', questionIndex)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const answers: Answer[] = [];
      snapshot.forEach((d) => {
        answers.push({ id: d.id, ...(d.data() as Omit<Answer, 'id'>) });
      });
      onUpdate(answers);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Resets a live session (clears previous answers and resets connected players' scores to 0)
 * so the teacher can restart the quiz from the beginning or return to the lobby without
 * requiring students to scan the QR code or type the PIN again.
 * Chunks write operations into batches of <= 450 to respect Firestore's 500-op limit.
 */
export async function restartLiveSession(
  sessionId: string,
  startImmediately = false,
  firstQuestionTimeLimit = 20
): Promise<void> {
  const MAX_BATCH_OPS = 450;

  try {
    const [answersSnap, playersSnap] = await Promise.all([
      getDocs(collection(db, 'sessions', sessionId, 'answers')),
      getDocs(collection(db, 'sessions', sessionId, 'players')),
    ]);

    let currentBatch = writeBatch(db);
    let opCount = 0;

    const flushBatchIfNeeded = async () => {
      if (opCount >= MAX_BATCH_OPS) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        opCount = 0;
      }
    };

    for (const ansDoc of answersSnap.docs) {
      await flushBatchIfNeeded();
      currentBatch.delete(ansDoc.ref);
      opCount++;
    }

    for (const playerDoc of playersSnap.docs) {
      await flushBatchIfNeeded();
      currentBatch.update(playerDoc.ref, {
        score: 0,
        streak: 0,
      });
      opCount++;
    }

    await flushBatchIfNeeded();

    const sessionRef = doc(db, 'sessions', sessionId);
    currentBatch.update(sessionRef, {
      status: startImmediately ? 'question' : 'lobby',
      currentQuestionIndex: 0,
      isAcceptingAnswers: Boolean(startImmediately),
      timeLimitSeconds: firstQuestionTimeLimit,
      questionStartedAt: Date.now(),
      revealedQuestion: null,
      rankingSnapshot: [],
    });

    await currentBatch.commit();
  } catch (error) {
    console.warn('Fallback session restart:', error);
    await updateSessionState(sessionId, {
      status: startImmediately ? 'question' : 'lobby',
      currentQuestionIndex: 0,
      isAcceptingAnswers: Boolean(startImmediately),
      timeLimitSeconds: firstQuestionTimeLimit,
      questionStartedAt: Date.now(),
      revealedQuestion: null,
      rankingSnapshot: [],
    });
  }
}

/**
 * Immediately closes an open live session from anywhere in the app.
 */
export async function closeLiveSession(sessionId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'sessions', sessionId), {
      status: 'finished',
      isAcceptingAnswers: false,
    });
  } catch (error) {
    console.warn('Could not close session:', error);
  }
}
