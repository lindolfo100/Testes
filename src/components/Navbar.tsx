import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, LogIn, LogOut, User as UserIcon, MonitorPlay, Smartphone } from 'lucide-react';

interface NavbarProps {
  currentView: 'dashboard' | 'student' | 'telao';
  onNavigate: (view: 'dashboard' | 'student' | 'telao') => void;
  activeSessionPin?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, activeSessionPin }) => {
  const { user, signInWithGoogle, signOutUser } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 text-left font-bold text-lg sm:text-xl text-white tracking-tight hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span>QuizClass Live</span>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              currentView === 'dashboard'
                ? 'text-indigo-400 font-semibold border-b-2 border-indigo-400'
                : 'hover:text-white'
            }`}
          >
            Painel do Professor
          </button>

          <button
            onClick={() => onNavigate('student')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              currentView === 'student'
                ? 'text-indigo-400 font-semibold border-b-2 border-indigo-400'
                : 'hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Entrar como Aluno</span>
          </button>

          {activeSessionPin && (
            <button
              onClick={() => onNavigate('telao')}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                currentView === 'telao'
                  ? 'text-indigo-400 font-semibold border-b-2 border-indigo-400'
                : 'hover:text-white text-emerald-400'
              }`}
            >
              <MonitorPlay className="w-4 h-4" />
              <span>Telão Ativo ({activeSessionPin})</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Professor'}
                    className="w-7 h-7 rounded-full border border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                  </div>
                )}
                <span className="font-medium truncate max-w-[140px]">{user.displayName || user.email}</span>
              </div>
              <button
                onClick={signOutUser}
                title="Sair da conta"
                className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Login do Professor</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
