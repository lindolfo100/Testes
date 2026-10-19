import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ValendoLogo } from './BrandIllustrations';
import {
  House,
  ChalkboardSimple,
  DeviceMobile,
  Monitor,
  SignIn,
  SignOut,
  User as UserIcon,
  X,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { PWAInstallButton } from './PWAInstallButton';

export type AppView = 'welcome' | 'dashboard' | 'student' | 'telao';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  activeSessionPin?: string | null;
  onCloseActiveSession?: () => void;
  onRestartActiveSession?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeSessionPin,
  onCloseActiveSession,
  onRestartActiveSession,
}) => {
  const { user, signInWithGoogle, signOutUser } = useAuth();

  return (
    <header className="border-b border-zinc-800/60 bg-zinc-950/85 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-2 sm:gap-3">
        {/* Playful Brand Logo */}
        <button
          type="button"
          onClick={() => onNavigate('welcome')}
          className="text-left focus:outline-none shrink-0"
          title="Voltar à tela de boas-vindas"
        >
          <ValendoLogo size="md" />
        </button>

        {/* Minimal Navigation Pills */}
        <nav className="flex items-center p-1 bg-zinc-900/80 rounded-xl border border-zinc-800/80 text-xs sm:text-sm overflow-x-auto">
          <button
            type="button"
            onClick={() => onNavigate('welcome')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all ${
              currentView === 'welcome'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <House size={16} weight={currentView === 'welcome' ? 'fill' : 'regular'} />
            <span className="hidden xs:inline sm:inline">Início</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all ${
              currentView === 'dashboard'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35 shadow-sm'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <ChalkboardSimple size={16} weight={currentView === 'dashboard' ? 'bold' : 'regular'} />
            <span>Prof</span>
            <span className="hidden sm:inline -ml-1.5">essor</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('student')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all ${
              currentView === 'student'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/35 shadow-sm'
                : 'text-zinc-300 hover:text-white'
            }`}
          >
            <DeviceMobile size={16} weight={currentView === 'student' ? 'bold' : 'regular'} />
            <span>Aluno</span>
          </button>

          {activeSessionPin && (
            <div className="flex items-center ml-1 pl-1 border-l border-zinc-800 gap-0.5">
              <button
                type="button"
                onClick={() => onNavigate('telao')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                  currentView === 'telao'
                    ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/40'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                }`}
                title="Abrir Telão ativo"
              >
                <Monitor size={15} weight={currentView === 'telao' ? 'bold' : 'regular'} />
                <span className="font-mono font-bold tabular-nums">{activeSessionPin}</span>
              </button>

              {onRestartActiveSession && (
                <button
                  type="button"
                  onClick={onRestartActiveSession}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800/80 transition-colors hidden sm:inline-flex"
                  title="Recomeçar quiz aberto do início"
                >
                  <ArrowCounterClockwise size={14} weight="bold" />
                </button>
              )}

              {onCloseActiveSession && (
                <button
                  type="button"
                  onClick={onCloseActiveSession}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                  title="Encerrar sala aberta imediatamente"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
          )}
        </nav>

        {/* User Account & PWA Install */}
        <div className="flex items-center gap-2">
          <PWAInstallButton />
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-zinc-300 px-2 py-1 rounded-lg">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Professor'}
                    className="w-6 h-6 rounded-full border border-zinc-700 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                    <UserIcon size={12} weight="bold" className="text-zinc-400" />
                  </div>
                )}
                <span className="hidden md:inline font-medium text-xs text-zinc-300 max-w-[120px] truncate">
                  {user.displayName || user.email}
                </span>
              </div>
              <button
                onClick={signOutUser}
                title="Sair da conta"
                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition-colors"
              >
                <SignOut size={16} weight="bold" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <SignIn size={14} weight="bold" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
