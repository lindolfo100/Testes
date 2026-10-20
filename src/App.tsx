import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar, AppView, StudentHeaderHud } from './components/Navbar';
import { PWAInstallBanner } from './components/PWAInstallButton';
import { WelcomeView } from './views/WelcomeView';
import { SAMPLE_QUIZZES } from './data/sampleQuizzes';
import { Quiz } from './types/quiz';
import {
  getTeacherQuizzes,
  createLiveSession,
  closeLiveSession,
  restartLiveSession,
} from './services/quizService';
import { auth, resolveCurrentUid } from './lib/firebase';
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
  const [activeSessionPin, setActiveSessionPin] = useState<string | null>(null);

  const [studentPrefilledPin, setStudentPrefilledPin] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPin = params.get('pin')?.replace(/\D/g, '');
    return urlPin && urlPin.length === 6 ? urlPin : null;
  });
  const [studentHud, setStudentHud] = useState<StudentHeaderHud | null>(null);
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
    getTeacherQuizzes(resolveCurrentUid()).then((data) => {
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
      const session = await createLiveSession(
        demoQuiz,
        resolveCurrentUid(),
        auth.currentUser?.displayName || 'Professor(a)'
      );
      handleStartSession(session.id, session.pin);
    } catch (err) {
      console.error('Failed to launch demo session:', err);
      setCurrentView('dashboard');
    } finally {
      setIsLaunchingDemo(false);
    }
  };

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const confirmAndCloseActiveSession = async () => {
    setShowCloseConfirm(false);
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

  const handleCloseActiveSession = () => {
    setShowCloseConfirm(true);
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
          studentHud={studentHud}
        />

        {(currentView === 'welcome' || currentView === 'dashboard') && <PWAInstallBanner />}

        <main className="flex-1">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24 text-xs text-zinc-400">
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
                onHudChange={setStudentHud}
              />
            )}
          </Suspense>
        </main>

        {showCloseConfirm && (
          <div
            onClick={() => setShowCloseConfirm(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
            >
              <h3 className="text-base font-bold text-zinc-100 font-display">
                Encerrar a sala ao vivo?
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                A apresentação (PIN {activeSessionPin}) será encerrada para todos os alunos conectados.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseConfirm(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmAndCloseActiveSession}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-zinc-950 text-xs font-bold transition-colors"
                >
                  Sim, Encerrar
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="border-t border-zinc-900/80 py-3.5 px-6 text-center text-xs text-zinc-400">
          Valendo! · Perguntas e Respostas em Tempo Real
        </footer>

        <OfflineIndicator />
      </div>
    </AuthProvider>
  );
}
