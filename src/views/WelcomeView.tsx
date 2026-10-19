import React, { useState } from 'react';
import {
  StepCreateIllustration,
  StepProjectIllustration,
  StepRespondIllustration,
} from '../components/BrandIllustrations';
import {
  ArrowRight,
  ChalkboardSimple,
  DeviceMobile,
  Play,
  Sparkle,
  QrCode,
  Lightning,
  Monitor,
  X,
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

  const handleQuickPinChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setQuickPin(cleaned);
    // Zero-friction: as soon as 6 digits are typed, jump straight to StudentView with PIN prefilled
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7 sm:py-12 space-y-8 sm:space-y-10">
      {/* Active Session Banner (if a quiz is currently open) */}
      {activeSessionPin && onResumeTelao && (
        <div className="p-4 rounded-2xl bg-emerald-950/35 border border-emerald-500/35 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-zinc-200 font-medium">
              Há uma apresentação aberta no telão ·{' '}
              <strong className="font-mono text-emerald-300">PIN {activeSessionPin}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResumeTelao}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Monitor size={14} weight="bold" />
              <span>Voltar ao Telão</span>
            </button>
            {onCloseActiveSession && (
              <button
                type="button"
                onClick={onCloseActiveSession}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/50 border border-zinc-800 hover:border-rose-500/40 text-zinc-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <X size={13} weight="bold" />
                <span>Encerrar Sala</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Friendly Hero Header */}
      <div className="text-center space-y-3.5 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs sm:text-sm font-semibold">
          <Sparkle size={15} weight="fill" className="text-amber-400" />
          <span>Atenção turma: tá valendo!</span>
        </div>

        <h1 className="text-[28px] sm:text-4xl md:text-5xl font-display font-extrabold text-zinc-100 tracking-tight leading-[1.15]">
          Perguntas ao vivo que deixam a aula{' '}
          <span className="bg-gradient-to-r from-amber-300 via-rose-400 to-emerald-300 bg-clip-text text-transparent">
            leve e participativa
          </span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-300 leading-relaxed">
          Escolha como deseja acessar agora: participe de uma rodada pelo celular ou conduza uma apresentação no telão da sala.
        </p>
      </div>

      {/* Main Role Selection Bento Cards (Student vs Teacher) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* CARD 1: MODO ALUNO */}
        <div className="p-5 sm:p-7 rounded-3xl bg-zinc-900/65 border border-zinc-800/90 hover:border-sky-500/45 transition-all flex flex-col justify-between space-y-5 group relative overflow-hidden shadow-lg shadow-black/20">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />

          <div className="space-y-4">
            {/* Top Tag */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs sm:text-sm font-semibold">
                <DeviceMobile size={15} weight="bold" />
                <span>Modo Aluno</span>
              </span>
              <span className="text-xs font-mono text-zinc-300 flex items-center gap-1.5">
                <QrCode size={14} weight="bold" className="text-sky-400" />
                <span>PIN ou QR Code</span>
              </span>
            </div>

            {/* Dark-Harmonized Illustration Frame */}
            <div className="illustration-frame aspect-[16/10] sm:aspect-[16/9] w-full border-sky-500/20 group-hover:border-sky-400/35 transition-colors">
              <img
                src="/ilustracao-aluno.jpg"
                alt="Estudante participando pelo celular"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/45 via-transparent to-transparent pointer-events-none" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-[26px] font-display font-extrabold text-zinc-100 tracking-tight">
                Vou responder pelo celular
              </h2>
              <p className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed">
                Digite os 6 dígitos do PIN projetado no telão — você avança automaticamente ao completar o código.
              </p>
            </div>
          </div>

          {/* Direct PIN Input Form */}
          <form onSubmit={handleQuickStudentSubmit} className="space-y-2.5 pt-1">
            <div className="flex flex-col xs:flex-row sm:flex-row gap-2.5">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={quickPin}
                onChange={(e) => handleQuickPinChange(e.target.value)}
                placeholder="PIN 000 000"
                className="w-full px-4 py-3.5 rounded-2xl bg-zinc-950 border border-zinc-750 focus:border-sky-400 text-white font-mono font-bold text-lg tracking-widest text-center placeholder:text-zinc-500 focus:outline-none transition-colors tabular-nums"
              />
              <button
                type="submit"
                className="px-6 py-3.5 rounded-2xl bg-sky-400 hover:bg-sky-300 text-zinc-950 font-display font-extrabold text-base shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 active:scale-[0.98]"
              >
                <span>Entrar</span>
                <ArrowRight size={18} weight="bold" />
              </button>
            </div>
          </form>
        </div>

        {/* CARD 2: MODO PROFESSOR */}
        <div className="p-5 sm:p-7 rounded-3xl bg-zinc-900/65 border border-zinc-800/90 hover:border-amber-500/45 transition-all flex flex-col justify-between space-y-5 group relative overflow-hidden shadow-lg shadow-black/20">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

          <div className="space-y-4">
            {/* Top Tag */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs sm:text-sm font-semibold">
                <ChalkboardSimple size={15} weight="bold" />
                <span>Modo Professor</span>
              </span>
              <span className="text-xs font-mono text-zinc-300 flex items-center gap-1.5">
                <Lightning size={14} weight="fill" className="text-amber-400" />
                <span>10 formatos ao vivo</span>
              </span>
            </div>

            {/* Dark-Harmonized Illustration Frame */}
            <div className="illustration-frame aspect-[16/10] sm:aspect-[16/9] w-full border-amber-500/20 group-hover:border-amber-400/35 transition-colors">
              <img
                src="/ilustracao-professor.jpg"
                alt="Professora conduzindo quiz no telão"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/45 via-transparent to-transparent pointer-events-none" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-[26px] font-display font-extrabold text-zinc-100 tracking-tight">
                Vou conduzir uma atividade
              </h2>
              <p className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed">
                Crie perguntas, gere com IA, projete o telão com QR Code e acompanhe os resultados em tempo real.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={onSelectTeacher}
              className="flex-1 py-3.5 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-extrabold text-base shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span>Painel do Professor</span>
              <ArrowRight size={18} weight="bold" />
            </button>

            <button
              type="button"
              onClick={onQuickLaunchDemo}
              disabled={isLaunchingDemo}
              className="py-3.5 px-4 rounded-2xl bg-zinc-850 hover:bg-zinc-800 text-zinc-100 border border-zinc-750 font-semibold text-sm transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              title="Iniciar imediatamente o Quiz de 10 Formatos no Telão"
            >
              <Play size={15} weight="fill" className="text-emerald-400" />
              <span>{isLaunchingDemo ? 'Abrindo...' : 'Testar Telão Demo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Illustrated 3-Step Visual Guide */}
      <div className="p-5 sm:p-7 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 space-y-5">
        <div className="text-center space-y-1">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-semibold">
            Dinâmica Simples e Sem Fricção
          </span>
          <h3 className="text-lg sm:text-xl font-display font-extrabold text-zinc-100">
            Como funciona em 3 passos
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/70 flex items-center sm:flex-col sm:text-center gap-4">
            <StepCreateIllustration className="w-18 h-18 sm:w-20 sm:h-20 shrink-0" />
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase text-rose-400 font-bold">
                1. Escolha ou Crie
              </span>
              <h4 className="text-base font-display font-bold text-zinc-100">
                10 formatos interativos
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Múltipla escolha, V/F, pares, sequência, nuvem de palavras, enquete e discursiva.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/70 flex items-center sm:flex-col sm:text-center gap-4">
            <StepProjectIllustration className="w-18 h-18 sm:w-20 sm:h-20 shrink-0" />
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase text-sky-400 font-bold">
                2. Projete no Telão
              </span>
              <h4 className="text-base font-display font-bold text-zinc-100">
                QR Code e PIN na tela
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Tipografia gigante pensada para leitura a distância no projetor da sala.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/70 flex items-center sm:flex-col sm:text-center gap-4">
            <StepRespondIllustration className="w-18 h-18 sm:w-20 sm:h-20 shrink-0" />
            <div className="space-y-1">
              <span className="text-xs font-mono uppercase text-emerald-400 font-bold">
                3. Todo Mundo Junto
              </span>
              <h4 className="text-base font-display font-bold text-zinc-100">
                Sem cadastro para o aluno
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Basta apontar a câmera do celular, digitar o nome e participar em tempo real.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
