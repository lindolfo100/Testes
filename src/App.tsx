import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { TeacherDashboard } from './views/TeacherDashboard';
import { TelaoView } from './views/TelaoView';
import { StudentView } from './views/StudentView';
import { SAMPLE_QUIZZES } from './data/sampleQuizzes';
import { Quiz } from './types/quiz';
import { getTeacherQuizzes } from './services/quizService';

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'student' | 'telao'>('dashboard');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionPin, setActiveSessionPin] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>(SAMPLE_QUIZZES);

  useEffect(() => {
    // Pre-fetch quizzes
    getTeacherQuizzes('all').then((data) => {
      if (data && data.length > 0) {
        setQuizzes(data);
      }
    });

    // Restore active session if present in sessionStorage
    const savedSesId = sessionStorage.getItem('quiz_active_session_id');
    const savedSesPin = sessionStorage.getItem('quiz_active_session_pin');
    if (savedSesId && savedSesPin) {
      setActiveSessionId(savedSesId);
      setActiveSessionPin(savedSesPin);
    }
  }, []);

  const handleStartSession = (sessionId: string, pin: string) => {
    setActiveSessionId(sessionId);
    setActiveSessionPin(pin);
    sessionStorage.setItem('quiz_active_session_id', sessionId);
    sessionStorage.setItem('quiz_active_session_pin', pin);
    setCurrentView('telao');
  };

  const handleExitTelao = () => {
    setCurrentView('dashboard');
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
        <Navbar
          currentView={currentView}
          onNavigate={(v) => setCurrentView(v)}
          activeSessionPin={activeSessionPin}
        />

        <main className="flex-1">
          {currentView === 'dashboard' && (
            <TeacherDashboard
              onStartSession={handleStartSession}
              onNavigateToStudent={() => setCurrentView('student')}
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
              initialPin={activeSessionPin}
              quizzes={quizzes}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          )}
        </main>

        {/* Minimal Subtle Footer */}
        <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
          QuizClass Live · Plataforma Educacional de Perguntas & Respostas em Tempo Real
        </footer>
      </div>
    </AuthProvider>
  );
}
