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
} from '@phosphor-icons/react';
import { PWAInstallButton } from '../components/PWAInstallButton';

interface WelcomeViewProps {
  onSelectTeacher: () => void;
  onSelectStudent: (prefilledPin?: string) => void;
  onQuickLaunchDemo: () => void;
  isLaunchingDemo?: boolean;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onSelectTeacher,
  onSelectStudent,
  onQuickLaunchDemo,
  isLaunchingDemo = false,
}) => {
  const [quickPin, setQuickPin] = useState('');

  const handleQuickStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = quickPin.replace(/\D/g, '');
    onSelectStudent(cleaned || undefined);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      {/* Friendly Hero Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/25 text-amber-300 text-xs font-semibold">
          <Sparkle size={14} weight="fill" className="text-amber-400" />
          <span>Atenção turma: tá valendo!</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold text-zinc-100 tracking-tight leading-[1.12]">
          Perguntas ao vivo que deixam a aula{' '}
          <span className="bg-gradient-to-r from-amber-300 via-rose-400 to-emerald-300 bg-clip-text text-transparent">
            leve e participativa
          </span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
          Escolha como deseja acessar agora: participe de uma rodada pelo celular ou conduza uma apresentação no telão da sala.
        </p>
      </div>

      {/* Main Role Selection Bento Cards (Student vs Teacher) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CARD 1: MODO ALUNO */}
        <div className="p-6 sm:p-7 rounded-3xl bg-zinc-900/60 border border-zinc-800/90 hover:border-sky-500/40 transition-all flex flex-col justify-between space-y-5 group relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />

          <div className="space-y-4">
            {/* Top Tag */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-semibold">
                <DeviceMobile size={14} weight="bold" />
                <span>Modo Aluno</span>
              </span>
              <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                <QrCode size={13} weight="bold" className="text-sky-400" />
                <span>PIN ou QR Code</span>
              </span>
            </div>

            {/* Colorful Illustration */}
            <div className="rounded-2xl overflow-hidden bg-[#FFFDF9] border border-zinc-800/60 h-48 sm:h-52 flex items-center justify-center p-2 shadow-sm">
              <img
                src="/ilustracao-aluno.jpg"
                alt="Estudante participando pelo celular"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-zinc-100">
                Vou responder pelo celular
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Digite o código de 6 dígitos projetado no telão da sala para entrar na rodada.
              </p>
            </div>
          </div>

          {/* Direct PIN Input Form */}
          <form onSubmit={handleQuickStudentSubmit} className="space-y-2.5 pt-1">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={quickPin}
                onChange={(e) => setQuickPin(e.target.value.replace(/\D/g, ''))}
                placeholder="PIN 000 000"
                className="w-full px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 focus:border-sky-400 text-white font-mono font-bold text-base tracking-widest text-center placeholder:text-zinc-600 focus:outline-none transition-colors tabular-nums"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-2xl bg-sky-400 hover:bg-sky-300 text-zinc-950 font-display font-bold text-sm shadow-sm transition-all flex items-center gap-2 shrink-0 active:scale-[0.98]"
              >
                <span>Entrar</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            </div>
          </form>
        </div>

        {/* CARD 2: MODO PROFESSOR */}
        <div className="p-6 sm:p-7 rounded-3xl bg-zinc-900/60 border border-zinc-800/90 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-5 group relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

          <div className="space-y-4">
            {/* Top Tag */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                <ChalkboardSimple size={14} weight="bold" />
                <span>Modo Professor</span>
              </span>
              <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                <Lightning size={13} weight="fill" className="text-amber-400" />
                <span>10 formatos ao vivo</span>
              </span>
            </div>

            {/* Colorful Illustration */}
            <div className="rounded-2xl overflow-hidden bg-[#FFFDF9] border border-zinc-800/60 h-48 sm:h-52 flex items-center justify-center p-2 shadow-sm">
              <img
                src="/ilustracao-professor.jpg"
                alt="Professora conduzindo quiz no telão"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-zinc-100">
                Vou conduzir uma atividade
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Crie perguntas, gere com IA, projete o telão com QR Code e acompanhe os resultados em tempo real.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={onSelectTeacher}
              className="flex-1 py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-display font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span>Painel do Professor</span>
              <ArrowRight size={16} weight="bold" />
            </button>

            <button
              type="button"
              onClick={onQuickLaunchDemo}
              disabled={isLaunchingDemo}
              className="py-3 px-4 rounded-2xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750 font-medium text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
              title="Iniciar imediatamente o Quiz de 10 Formatos no Telão"
            >
              <Play size={14} weight="fill" className="text-emerald-400" />
              <span>{isLaunchingDemo ? 'Abrindo...' : 'Testar Telão Demo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Illustrated 3-Step Visual Guide */}
      <div className="p-6 rounded-3xl bg-zinc-900/35 border border-zinc-800/70 space-y-5">
        <div className="text-center space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
            Dinâmica Simples e Sem Fricção
          </span>
          <h3 className="text-base sm:text-lg font-display font-bold text-zinc-200">
            Como funciona em 3 passos
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 flex items-center sm:flex-col sm:text-center gap-3.5">
            <StepCreateIllustration className="w-16 h-16 shrink-0" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-rose-400 font-bold">
                1. Escolha ou Crie
              </span>
              <h4 className="text-sm font-display font-bold text-zinc-100">
                10 formatos interativos
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Múltipla escolha, V/F, pares, sequência, nuvem de palavras, enquete e discursiva.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 flex items-center sm:flex-col sm:text-center gap-3.5">
            <StepProjectIllustration className="w-16 h-16 shrink-0" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-sky-400 font-bold">
                2. Projete no Telão
              </span>
              <h4 className="text-sm font-display font-bold text-zinc-100">
                QR Code e PIN na tela
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tipografia gigante pensada para leitura a distância no projetor da sala.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 flex items-center sm:flex-col sm:text-center gap-3.5">
            <StepRespondIllustration className="w-16 h-16 shrink-0" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                3. Todo Mundo Junto
              </span>
              <h4 className="text-sm font-display font-bold text-zinc-100">
                Sem cadastro para o aluno
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Basta apontar a câmera do celular, digitar o nome e participar em tempo real.
              </p>
            </div>
          </div>
        </div>

        {/* PWA App Callout */}
        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Disponível como aplicativo para celulares, tablets e computador (PWA com modo tela cheia).</span>
          </div>
          <PWAInstallButton variant="full" />
        </div>
      </div>
    </div>
  );
};
