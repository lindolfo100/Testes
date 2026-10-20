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
  Clock,
} from '@phosphor-icons/react';

export type AppView = 'welcome' | 'dashboard' | 'student' | 'telao';

export interface StudentHeaderHud {
  nickname: string;
  score: number;
  timeLeft?: number;
  showTimer?: boolean;
}

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  activeSessionPin?: string | null;
  onCloseActiveSession?: () => void;
  studentHud?: StudentHeaderHud | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeSessionPin,
  onCloseActiveSession,
  studentHud,
}) => {
  const { user, signInWithGoogle, signOutUser } = useAuth();

  // 1. MODO ALUNO EM RODADA: esconder navegação inteira; mostrar apenas nome, tempo restante e pontos
  if (currentView === 'student' && studentHud) {
    return (
      <header className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-semibold text-sm text-zinc-100 truncate">
              {studentHud.nickname}
            </span>
          </div>

          {studentHud.showTimer && typeof studentHud.timeLeft === 'number' && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-bold tabular-nums border ${
                studentHud.timeLeft <= 5
                  ? 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-200'
              }`}
              aria-label={`Tempo restante: ${studentHud.timeLeft} segundos`}
            >
              <Clock size={14} weight="bold" />
              <span>{studentHud.timeLeft}s</span>
            </div>
          )}

          <div className="font-mono text-xs font-bold text-zinc-100 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg tabular-nums shrink-0">
            {studentHud.score} pts
          </div>
        </div>
      </header>
    );
  }

  // 2. PROFESSOR EM RODADA / TELÃO: esconder abas; mostrar apenas PIN (chip) e botão Encerrar
  if (currentView === 'telao') {
    return (
      <header className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="text-left focus:outline-none shrink-0 min-h-[44px] flex items-center"
            aria-label="Voltar ao Painel do Professor"
          >
            <ValendoLogo size="sm" />
          </button>

          <div className="flex items-center gap-2">
            {activeSessionPin && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold tabular-nums">
                <Monitor size={14} weight="bold" />
                <span>PIN {activeSessionPin.slice(0, 3)} {activeSessionPin.slice(3)}</span>
              </div>
            )}

            {onCloseActiveSession && (
              <button
                type="button"
                onClick={onCloseActiveSession}
                aria-label="Encerrar apresentação"
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-rose-950/50 border border-zinc-800 hover:border-rose-500/40 text-zinc-200 hover:text-rose-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <X size={15} weight="bold" />
                <span>Encerrar</span>
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  // 3. HEADER PADRÃO (Home, Painel do Professor, Entrada do Aluno antes da rodada)
  // No celular: mínimo (logo + nome + Entrar). Abas só em desktop (md+) e nunca mostra aba Prof para o aluno.
  const isStudentScreen = currentView === 'student';

  return (
    <header className="border-b border-zinc-800/70 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate('welcome')}
          className="text-left focus:outline-none shrink-0 min-h-[44px] flex items-center"
          aria-label="Ir para o início do Valendo!"
        >
          <ValendoLogo size="sm" />
        </button>

        {/* Abas apenas em telas largas (desktop) e ocultas na visão do aluno */}
        {!isStudentScreen && (
          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center p-1 bg-zinc-900/80 rounded-xl border border-zinc-800/80 text-xs gap-1"
          >
            <button
              type="button"
              onClick={() => onNavigate('welcome')}
              className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                currentView === 'welcome'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <House size={15} weight={currentView === 'welcome' ? 'fill' : 'regular'} />
              <span>Início</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className={`min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <ChalkboardSimple size={15} weight={currentView === 'dashboard' ? 'bold' : 'regular'} />
              <span>Professor</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('student')}
              className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              <DeviceMobile size={15} weight="regular" />
              <span>Aluno</span>
            </button>

            {activeSessionPin && (
              <button
                type="button"
                onClick={() => onNavigate('telao')}
                className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/35 hover:bg-emerald-950 transition-colors ml-1"
                title="Voltar ao Telão ativo"
              >
                <Monitor size={15} weight="bold" />
                <span className="font-mono font-bold tabular-nums">PIN {activeSessionPin}</span>
              </button>
            )}
          </nav>
        )}

        {/* Conta do usuário (oculta para o aluno para evitar distração) */}
        {!isStudentScreen ? (
          <div className="flex items-center gap-2 shrink-0">
            {user && !user.isAnonymous ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-2 text-xs text-zinc-200 px-2 py-1 rounded-lg">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Professor'}
                      className="w-6 h-6 rounded-full border border-zinc-700 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                      <UserIcon size={12} weight="bold" className="text-zinc-300" />
                    </div>
                  )}
                  <span className="hidden sm:inline font-medium text-xs text-zinc-200 max-w-[120px] truncate">
                    {user.displayName || user.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={signOutUser}
                  aria-label="Sair da conta"
                  title="Sair da conta"
                  className="min-w-[44px] min-h-[44px] p-2 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors flex items-center justify-center"
                >
                  <SignOut size={17} weight="bold" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-zinc-100 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <SignIn size={15} weight="bold" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('welcome')}
            className="min-h-[44px] px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl transition-colors"
          >
            Início
          </button>
        )}
      </div>
    </header>
  );
};

