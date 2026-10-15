import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Quiz, Session, Player, Answer, SessionStatus } from '../types/quiz';
import { SAMPLE_QUIZZES } from '../data/sampleQuizzes';

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

export async function createQuiz(quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const quizId = 'quiz_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();
  const path = `quizzes/${quizId}`;
  const resolvedOwnerId = auth.currentUser?.uid || quiz.ownerId || 'guest';

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
    const currentUid = auth.currentUser?.uid || updates.ownerId || 'guest';

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
  const pin = generateRoomPin();
  const now = new Date().toISOString();
  const path = `sessions/${sessionId}`;

  const firstQuestionTime = quiz.questions[0]?.timeLimit || 20;

  const sessionData: Session = {
    id: sessionId,
    pin,
    hostId,
    hostName: hostName || 'Professor(a)',
    quizId: quiz.id,
    quizTitle: quiz.title,
    status: 'lobby',
    currentQuestionIndex: 0,
    totalQuestions: quiz.questions.length,
    isAcceptingAnswers: false,
    timeLimitSeconds: firstQuestionTime,
    createdAt: now,
  };

  try {
    await setDoc(doc(db, 'sessions', sessionId), sessionData);
    return sessionData;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function findSessionByPin(pin: string): Promise<Session | null> {
  const path = 'sessions';
  try {
    const q = query(collection(db, 'sessions'), where('pin', '==', pin.trim()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    // Find active or recent session
    const docSnap = snapshot.docs[0];
    return { id: docSnap.id, ...(docSnap.data() as Omit<Session, 'id'>) };
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
  answer: Omit<Answer, 'id' | 'submittedAt'>,
  currentScore: number,
  currentStreak: number
): Promise<void> {
  const answerId = 'ans_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const path = `sessions/${sessionId}/answers/${answerId}`;
  const now = new Date().toISOString();

  const answerPayload: Answer = {
    ...answer,
    id: answerId,
    submittedAt: now,
  };

  try {
    // 1. Save answer
    await setDoc(doc(db, 'sessions', sessionId, 'answers', answerId), answerPayload);

    // 2. Update player's score and streak
    const newStreak = answer.isCorrect ? currentStreak + 1 : 0;
    const newScore = currentScore + (answer.isCorrect ? answer.pointsAwarded : 0);

    const playerRef = doc(db, 'sessions', sessionId, 'players', answer.playerId);
    await updateDoc(playerRef, {
      score: newScore,
      streak: newStreak,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
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
