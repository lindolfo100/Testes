import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { STORAGE_KEYS } from '../constants/storage';
import { DownloadSimple, DeviceMobile, X, CheckCircle } from '@phosphor-icons/react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.PWA_BANNER_DISMISSED) === '1';
    } catch {
      return false;
    }
  });
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEYS.PWA_BANNER_DISMISSED, '1');
    } catch {}
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstalledSuccess(true);
        setTimeout(() => handleDismiss(), 2500);
      }
    } else {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      <div className="bg-zinc-900/90 border-b border-zinc-800/80 px-4 py-2 text-xs text-zinc-300">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <DownloadSimple size={16} weight="bold" className="text-amber-400 shrink-0" />
            <span className="truncate">
              Instale o <strong className="text-zinc-100">Valendo!</strong> para acesso rápido em tela cheia.
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-100 font-semibold transition-colors flex items-center gap-1.5"
            >
              {installedSuccess ? (
                <>
                  <CheckCircle size={14} weight="fill" className="text-emerald-400" />
                  <span className="text-emerald-300">Instalado!</span>
                </>
              ) : (
                <span>Instalar</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dispensar aviso de instalação"
              title="Não mostrar novamente"
              className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 flex items-center justify-center transition-colors"
            >
              <X size={15} weight="bold" />
            </button>
          </div>
        </div>
      </div>

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
                aria-label="Fechar instruções de instalação"
                className="min-w-[44px] min-h-[44px] p-2 rounded-lg text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <p>
                  No Safari do iOS, fixe o <strong>Valendo!</strong> na tela de início:
                </p>
                <ol className="space-y-2 list-decimal list-inside bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs text-zinc-300">
                  <li>
                    Toque em <strong className="text-zinc-100">Compartilhar</strong> na barra do Safari.
                  </li>
                  <li>
                    Selecione <strong className="text-zinc-100">Adicionar à Tela de Início</strong>.
                  </li>
                  <li>
                    Confirme em <strong className="text-zinc-100">Adicionar</strong>.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                <p>
                  Para instalar o <strong>Valendo!</strong> no navegador:
                </p>
                <ol className="space-y-2 list-decimal list-inside bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs text-zinc-300">
                  <li>
                    Abra o <strong className="text-zinc-100">menu do navegador (⋮)</strong>.
                  </li>
                  <li>
                    Toque em <strong className="text-zinc-100">Instalar aplicativo</strong> ou <em>Adicionar à tela inicial</em>.
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowIOSGuide(false);
                handleDismiss();
              }}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

