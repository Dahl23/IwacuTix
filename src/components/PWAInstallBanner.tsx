import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

export const PWAInstallBanner: React.FC = () => {
  const { isInstalled, hasPrompt, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('iwacutix_pwa_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('iwacutix_pwa_banner_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (hasPrompt) {
      const success = await install();
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 text-white px-3 py-2 border-b border-orange-500/20 shadow-xs flex items-center justify-between gap-2.5 transition-all text-left">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-brand-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              Installer IwacuTix sur votre téléphone
            </p>
            <p className="text-[10px] text-slate-300 truncate">
              Accédez à vos billets 100% hors-ligne
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-install-banner-action"
            onClick={handleInstallClick}
            className="px-3 py-1 bg-brand-primary hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3 h-3" />
            Installer
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Ignorer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
