import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'profile' | 'compact' | 'floating';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  variant = 'header',
  className = ''
}) => {
  const { isInstalled, hasPrompt, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running as standalone app, hide the button
  if (isInstalled) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };

  return (
    <>
      {variant === 'floating' && (
        <button
          id="btn-pwa-install-floating"
          onClick={handleClick}
          className={`fixed bottom-20 left-4 sm:bottom-6 sm:left-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white font-bold text-xs shadow-xl shadow-orange-500/35 hover:shadow-orange-500/55 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/25 backdrop-blur-md cursor-pointer group ${className}`}
          title="Installer IwacuTix sur votre écran d'accueil"
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
            <Download className="w-3 h-3 text-white" />
          </div>
          <span className="tracking-tight text-white drop-shadow-xs font-semibold">Installer l'app</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
        </button>
      )}

      {variant === 'header' && (
        <button
          id="btn-pwa-install-header"
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-brand-primary border border-orange-500/20 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${className}`}
          title="Installer l'application sur votre téléphone"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden xs:inline sm:inline">Installer l'app</span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          id="btn-pwa-install-compact"
          onClick={handleClick}
          className={`p-2 rounded-xl bg-orange-50 text-brand-primary hover:bg-orange-100 transition-colors cursor-pointer ${className}`}
          title="Installer l'application"
        >
          <Download className="w-4 h-4" />
        </button>
      )}

      {variant === 'profile' && (
        <button
          id="btn-pwa-install-profile"
          onClick={handleClick}
          className={`w-full p-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-2xl flex items-center justify-between shadow-md shadow-orange-500/20 transition-all cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Installer l'application IwacuTix</p>
              <p className="text-[10px] text-orange-100">
                Accès direct depuis l'écran d'accueil & billets hors-ligne
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold bg-white text-brand-primary px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-xs">
            Installer
          </span>
        </button>
      )}

      {variant === 'banner' && (
        <button
          id="btn-pwa-install-banner"
          onClick={handleClick}
          className={`px-3 py-1.5 bg-brand-primary hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          Installer
        </button>
      )}

      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
