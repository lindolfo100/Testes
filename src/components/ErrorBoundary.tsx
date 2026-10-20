import React from 'react';
import { ArrowCounterClockwise, WarningCircle } from '@phosphor-icons/react';
import { reportClientError } from '../lib/errorTelemetry';
import { STORAGE_KEYS } from '../constants/storage';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Valendo! runtime error:', error, info);
    reportClientError(error, info.componentStack || undefined);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_PIN);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_PIN);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_ID);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_ANSWERED_KEY);
      localStorage.removeItem(STORAGE_KEYS.PLAYER_SELECTED_ANSWER);
    } catch {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-sm w-full p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <WarningCircle size={26} weight="fill" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-extrabold font-display text-zinc-100">
                Ops! Algo saiu do esperado
              </h1>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Ocorreu uma falha temporária na tela. Você pode recarregar agora ou voltar ao início.
              </p>
            </div>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-extrabold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ArrowCounterClockwise size={16} weight="bold" />
                <span>Recarregar página</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 text-xs font-semibold transition-colors"
              >
                Limpar sessão local e ir ao início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
