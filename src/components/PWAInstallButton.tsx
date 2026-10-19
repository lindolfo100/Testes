import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { DownloadSimple, DeviceMobile, X, CheckCircle, ShareNetwork } from '@phosphor-icons/react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // If already running as an installed PWA in standalone mode, suppress button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // General instructions for desktop/mobile browsers that do not trigger beforeinstallprompt
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={
          className ||
          `px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 text-xs font-medium transition-all flex items-center gap-1.5 active:scale-[0.98]`
        }
        title="Instalar Valendo! no celular, tablet ou computador"
      >
        {installedSuccess ? (
          <>
            <CheckCircle size={14} weight="fill" className="text-emerald-400" />
            <span className="text-emerald-400">Instalado!</span>
          </>
        ) : (
          <>
            <DownloadSimple size={14} weight="bold" className="text-amber-400" />
            <span className={variant === 'compact' ? 'hidden sm:inline' : 'inline'}>
              Instalar App
            </span>
          </>
        )}
      </button>

      {/* Guide modal for iOS and alternative browsers */}
      {showIOSGuide && (
        <div
          onClick={() => setShowIOSGuide(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DeviceMobile size={18} weight="bold" className="text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100">
                  {isIOS ? 'Instalar no iPhone / iPad' : 'Instalar no Navegador'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <p>
                  No Safari do iOS, você pode fixar o <strong>Valendo!</strong> na sua tela de início sem precisar da App Store:
                </p>
                <ol className="space-y-2 list-decimal list-inside bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-400">
                  <li>
                    Toque no botão <strong className="text-zinc-200">Compartilhar</strong> (ícone com quadrado e seta para cima).
                  </li>
                  <li>
                    Role para baixo e selecione <strong className="text-zinc-200">Adicionar à Tela de Início</strong>.
                  </li>
                  <li>
                    Toque em <strong className="text-zinc-200">Adicionar</strong> no canto superior direito.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <p>
                  Para fixar o <strong>Valendo!</strong> como aplicativo nativo no Chrome, Edge ou celular:
                </p>
                <ol className="space-y-2 list-decimal list-inside bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono text-[11px] text-zinc-400">
                  <li>
                    Clique nos <strong className="text-zinc-200">três pontinhos (Menu)</strong> do navegador.
                  </li>
                  <li>
                    Selecione <strong className="text-zinc-200">Instalar Valendo!</strong> ou <em>Adicionar à Tela Inicial</em>.
                  </li>
                  <li>Abra o aplicativo direto com suporte a tela cheia.</li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
