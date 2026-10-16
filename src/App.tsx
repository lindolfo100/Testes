import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar, AppView } from './components/Navbar';
import { WelcomeView } from './views/WelcomeView';
import { TeacherDashboard } from './views/TeacherDashboard';
import { TelaoView } from './views/TelaoView';
import { StudentView } from './views/StudentView';
import { SAMPLE_QUIZZES } from './data/sampleQuizzes';
import { Quiz } from './types/quiz';
import { getTeacherQuizzes, createLiveSession } from './services/quizService';
import { STORAGE_KEYS } from './constants/storage';
import { OfflineIndicator } from './components/OfflineIndicator';

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
    getTeacherQuizzes('guest').then((data) => {
      if (data && data.length > 0) {
        setQuizzes(data);
      }
    });

    // Check URL parameter first (?pin=123456 from QR Code or Direct Link)
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin')?.replace(/\D/g, '');
    if (urlPin && urlPin.length === 6) {
      setStudentPrefilledPin(urlPin);
      setCurrentView('student');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const savedSesId = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
    const savedSesPin = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_PIN);
    if (savedSesId && savedSesPin) {
      setActiveSessionId(savedSesId);
      setActiveSessionPin(savedSesPin);
    }
  }, []);

  const handleStartSession = (sessionId: string, pin: string) => {
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
        />

        <main className="flex-1">
          {currentView === 'welcome' && (
            <WelcomeView
              onSelectTeacher={() => setCurrentView('dashboard')}
              onSelectStudent={(pinFromWelcome) => {
                if (pinFromWelcome) setStudentPrefilledPin(pinFromWelcome);
                setCurrentView('student');
              }}
              onQuickLaunchDemo={handleQuickLaunchDemo}
              isLaunchingDemo={isLaunchingDemo}
            />
          )}

          {currentView === 'dashboard' && (
            <TeacherDashboard
              onStartSession={handleStartSession}
              onNavigateToStudent={() => setCurrentView('student')}
              onQuizzesUpdated={(updated) => setQuizzes(updated)}
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
        </main>

        <footer className="border-t border-zinc-900/80 py-3.5 px-6 text-center text-[11px] text-zinc-500 font-mono">
          Valendo! · Perguntas e Respostas em Tempo Real
        </footer>

        <OfflineIndicator />
      </div>
    </AuthProvider>
  );
}
