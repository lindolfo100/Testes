import React, { useState } from 'react';
import {
  ArrowRight,
  ChalkboardSimple,
  DeviceMobile,
  Play,
  Monitor,
  X,
  Question,
} from '@phosphor-icons/react';

interface WelcomeViewProps {
  onSelectTeacher: () => void;
  onSelectStudent: (prefilledPin?: string) => void;
  onQuickLaunchDemo: () => void;
  isLaunchingDemo?: boolean;
  activeSessionPin?: string | null;
  onResumeTelao?: () => void;
  onCloseActiveSession?: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onSelectTeacher,
  onSelectStudent,
  onQuickLaunchDemo,
  isLaunchingDemo = false,
  activeSessionPin,
  onResumeTelao,
  onCloseActiveSession,
}) => {
  const [quickPin, setQuickPin] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const handleQuickPinChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setQuickPin(cleaned);
    if (cleaned.length === 6) {
      onSelectStudent(cleaned);
    }
  };

  const handleQuickStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = quickPin.replace(/\D/g, '');
    onSelectStudent(cleaned || undefined);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-10 space-y-5">
      {/* Active Session Banner (if teacher has an open quiz) */}
      {activeSessionPin && onResumeTelao && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-zinc-200 font-medium truncate">
              Sala ativa · <strong className="font-mono text-emerald-300">PIN {activeSessionPin}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onResumeTelao}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Monitor size={14} weight="bold" />
              <span>Telão</span>
            </button>
            {onCloseActiveSession && (
              <button
                type="button"
                onClick={onCloseActiveSession}
                aria-label="Encerrar sala ativa"
                className="min-w-[38px] min-h-[38px] p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/50 border border-zinc-800 text-zinc-300 hover:text-rose-300 flex items-center justify-center transition-colors"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Short Title & 1-Line Subtitle */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-zinc-100 tracking-tight">
          Quiz ao vivo em sala de aula
        </h1>
        <p className="text-sm text-zinc-300">
          Digite o PIN do telão para responder ou acesse o painel do professor.
        </p>
      </div>

      {/* 2. Primary Action: Student PIN Input + Entrar */}
      <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-sky-300">
            <DeviceMobile size={16} weight="bold" />
            <span>Participar como Aluno</span>
          </span>
          <span className="text-zinc-300 font-mono">6 dígitos</span>
        </div>

        <form onSubmit={handleQuickStudentSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={quickPin}
            onChange={(e) => handleQuickPinChange(e.target.value)}
            placeholder="PIN 000 000"
            aria-label="Código PIN de 6 dígitos da sala"
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-750 focus:border-sky-400 text-white font-mono font-bold text-lg tracking-widest text-center placeholder:text-zinc-400 focus:outline-none transition-colors tabular-nums"
          />
          <button
            type="submit"
            className="min-h-[48px] px-6 py-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-zinc-950 font-display font-extrabold text-base transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <span>Entrar</span>
            <ArrowRight size={18} weight="bold" />
          </button>
        </form>
      </div>

      {/* 3. Teacher Action: Compact Button with 1 support line */}
      <button
        type="button"
        onClick={onSelectTeacher}
        className="w-full min-h-[56px] p-4 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-left transition-colors flex items-center justify-between gap-3 group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
            <ChalkboardSimple size={20} weight="bold" />
          </div>
          <div className="min-w-0">
            <span className="text-base font-display font-bold text-zinc-100 block">
              Painel do Professor
            </span>
            <span className="text-xs text-zinc-300 block truncate">
              Criar questionários, apresentar no telão e ver relatórios
            </span>
          </div>
        </div>
        <ArrowRight
          size={18}
          weight="bold"
          className="text-zinc-300 group-hover:text-amber-300 shrink-0 transition-colors"
        />
      </button>

      {/* 4. Secondary Links: Testar Demo & Ver como funciona */}
      <div className="pt-1 flex items-center justify-center gap-4 text-xs text-zinc-300">
        <button
          type="button"
          onClick={onQuickLaunchDemo}
          disabled={isLaunchingDemo}
          className="min-h-[44px] px-2.5 py-2 hover:text-white inline-flex items-center gap-1.5 font-medium transition-colors disabled:opacity-50"
        >
          <Play size={13} weight="fill" className="text-emerald-400" />
          <span>{isLaunchingDemo ? 'Abrindo demo...' : 'Testar telão demo'}</span>
        </button>

        <span className="text-zinc-700">·</span>

        <button
          type="button"
          onClick={() => setShowHowItWorks((v) => !v)}
          className="min-h-[44px] px-2.5 py-2 hover:text-white inline-flex items-center gap-1.5 font-medium transition-colors"
        >
          <Question size={14} weight="bold" className="text-zinc-400" />
          <span>{showHowItWorks ? 'Ocultar ajuda' : 'Ver como funciona'}</span>
        </button>
      </div>

      {/* Collapsible 3-step summary */}
      {showHowItWorks && (
        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-2.5 text-xs text-zinc-300">
          <p className="font-semibold text-zinc-100">Como funciona em 3 passos:</p>
          <ol className="space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>
              <strong className="text-zinc-100">Crie ou escolha:</strong> monte perguntas em 10 formatos ou gere com IA no Painel do Professor.
            </li>
            <li>
              <strong className="text-zinc-100">Projete no telão:</strong> exiba o QR Code e o PIN de 6 dígitos para a turma.
            </li>
            <li>
              <strong className="text-zinc-100">Responda ao vivo:</strong> os alunos entram sem cadastro e o resultado aparece na hora.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};

