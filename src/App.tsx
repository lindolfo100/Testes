import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar, AppView } from './components/Navbar';
import { WelcomeView } from './views/WelcomeView';
import { SAMPLE_QUIZZES } from './data/sampleQuizzes';
import { Quiz } from './types/quiz';
import {
  getTeacherQuizzes,
  createLiveSession,
  closeLiveSession,
  restartLiveSession,
} from './services/quizService';
import { STORAGE_KEYS } from './constants/storage';
import { OfflineIndicator } from './components/OfflineIndicator';

const TeacherDashboard = lazy(() =>
  import('./views/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard }))
);
const TelaoView = lazy(() =>
  import('./views/TelaoView').then((m) => ({ default: m.TelaoView }))
);
const StudentView = lazy(() =>
  import('./views/StudentView').then((m) => ({ default: m.StudentView }))
);

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin')?.replace(/\D/g, '');
    return urlPin && urlPin.length === 6 ? 'student' : 'welcome';
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionPin, setActiveSessionPin] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin')?.replace(/\D/g, '');
    return urlPin && urlPin.length === 6 ? urlPin : null;
  });

  const [studentPrefilledPin, setStudentPrefilledPin] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>(SAMPLE_QUIZZES);
  const [isLaunchingDemo, setIsLaunchingDemo] = useState(false);

  useEffect(() => {
    // Check URL parameter first (?pin=123456 from QR Code or Direct Link)
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin')?.replace(/\D/g, '');
    if (urlPin && urlPin.length === 6) {
      setStudentPrefilledPin(urlPin);
      setCurrentView('student');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // Only load teacher quizzes when not entering directly as a student
    getTeacherQuizzes('guest').then((data) => {
      if (data && data.length > 0) {
        setQuizzes(data);
      }
    });

    const savedSesId = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
    const savedSesPin = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_PIN);
    if (savedSesId && savedSesPin) {
      setActiveSessionId(savedSesId);
      setActiveSessionPin(savedSesPin);
    }
  }, []);

  const handleStartSession = (sessionId: string, pin: string) => {
    if (activeSessionId && activeSessionId !== sessionId) {
      closeLiveSession(activeSessionId);
    }
    setActiveSessionId(sessionId);
    setActiveSessionPin(pin);
    sessionStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, sessionId);
    sessionStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_PIN, pin);
    setCurrentView('telao');
  };

  const handleQuickLaunchDemo = async () => {
    setIsLaunchingDemo(true);
    try {
      const demoQuiz = quizzes[0] || SAMPLE_QUIZZES[0];
      const session = await createLiveSession(demoQuiz, 'prof_demo', 'Professor(a)');
      handleStartSession(session.id, session.pin);
    } catch (err) {
      console.error('Failed to launch demo session:', err);
      setCurrentView('dashboard');
    } finally {
      setIsLaunchingDemo(false);
    }
  };

  const handleCloseActiveSession = async () => {
    const idToClose = activeSessionId;
    setActiveSessionId(null);
    setActiveSessionPin(null);
    sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
    sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_PIN);
    if (currentView === 'telao') {
      setCurrentView('dashboard');
    }
    if (idToClose) {
      await closeLiveSession(idToClose);
    }
  };

  const handleRestartActiveSession = async () => {
    if (!activeSessionId) return;
    await restartLiveSession(activeSessionId, false);
    setCurrentView('telao');
  };

  const handleExitTelao = (endRoom = false) => {
    if (endRoom) {
      setActiveSessionId(null);
      setActiveSessionPin(null);
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_PIN);
    }
    setCurrentView('dashboard');
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
        <Navbar
          currentView={currentView}
          onNavigate={(v) => setCurrentView(v)}
          activeSessionPin={activeSessionId ? activeSessionPin : null}
          onCloseActiveSession={activeSessionId ? handleCloseActiveSession : undefined}
          onRestartActiveSession={activeSessionId ? handleRestartActiveSession : undefined}
        />

        <main className="flex-1">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24 text-xs font-mono text-zinc-500">
                Carregando...
              </div>
            }
          >
            {currentView === 'welcome' && (
              <WelcomeView
                onSelectTeacher={() => setCurrentView('dashboard')}
                onSelectStudent={(pinFromWelcome) => {
                  if (pinFromWelcome) setStudentPrefilledPin(pinFromWelcome);
                  setCurrentView('student');
                }}
                onQuickLaunchDemo={handleQuickLaunchDemo}
                isLaunchingDemo={isLaunchingDemo}
                activeSessionPin={activeSessionId ? activeSessionPin : null}
                onResumeTelao={activeSessionId ? () => setCurrentView('telao') : undefined}
                onCloseActiveSession={activeSessionId ? handleCloseActiveSession : undefined}
              />
            )}

            {currentView === 'dashboard' && (
              <TeacherDashboard
                onStartSession={handleStartSession}
                onNavigateToStudent={() => setCurrentView('student')}
                onQuizzesUpdated={(updated) => setQuizzes(updated)}
                activeSessionPin={activeSessionId ? activeSessionPin : null}
                onResumeTelao={activeSessionId ? () => setCurrentView('telao') : undefined}
                onRestartActiveSession={activeSessionId ? handleRestartActiveSession : undefined}
                onCloseActiveSession={activeSessionId ? handleCloseActiveSession : undefined}
              />
            )}

            {currentView === 'telao' && activeSessionId && (
              <TelaoView
                sessionId={activeSessionId}
                quizzes={quizzes}
                onExit={handleExitTelao}
                onNavigateToStudent={() => setCurrentView('student')}
              />
            )}

            {currentView === 'student' && (
              <StudentView
                initialPin={studentPrefilledPin || activeSessionPin}
                quizzes={quizzes}
                onBackToDashboard={() => setCurrentView('welcome')}
              />
            )}
          </Suspense>
        </main>

        <footer className="border-t border-zinc-900/80 py-3.5 px-6 text-center text-[11px] text-zinc-500 font-mono">
          Valendo! · Perguntas e Respostas em Tempo Real
        </footer>

        <OfflineIndicator />
      </div>
    </AuthProvider>
  );
}
