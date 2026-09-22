import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Download, 
  Smartphone, 
  Share2, 
  PlusSquare, 
  CheckCircle2, 
  X, 
  Zap, 
  WifiOff, 
  ShieldCheck,
  ExternalLink,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { hasPrompt, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [installError, setInstallError] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    setIsInstalling(true);
    setInstallError(null);
    try {
      const success = await install();
      if (success) {
        onClose();
      } else {
        setInstallError("Le navigateur n'a pas encore validé l'invite automatique. Utilisez l'option du menu ou ouvrez l'app dans un nouvel onglet.");
      }
    } catch {
      setInstallError("Impossible de lancer l'installation automatique.");
    } finally {
      setIsInstalling(false);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-left max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with App Logo & Close */}
        <div className="p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 pr-8">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 p-1 shadow-lg border border-orange-500/40 overflow-hidden flex items-center justify-center shrink-0">
              <img 
                src="/icon.svg" 
                alt="IwacuTix" 
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold">
                  Application Mobile PWA
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-300 text-[9px] font-bold border border-orange-500/30">
                  Gratuit
                </span>
              </div>
              <h2 className="text-xl font-display font-black text-white leading-tight mt-0.5">
                Iwacu<span className="text-brand-primary">Tix</span> Burundi
              </h2>
              <p className="text-xs text-slate-300">
                Installez l'application sur votre écran d'accueil
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable body content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Key Advantages */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 bg-orange-50/80 border border-orange-100 rounded-2xl space-y-1">
              <Zap className="w-4 h-4 text-brand-primary mx-auto" />
              <p className="text-[10px] font-bold text-slate-800">Ultra Rapide</p>
              <p className="text-[9px] text-slate-500">Ouverture directe</p>
            </div>
            <div className="p-2.5 bg-emerald-50/80 border border-emerald-100 rounded-2xl space-y-1">
              <WifiOff className="w-4 h-4 text-emerald-600 mx-auto" />
              <p className="text-[10px] font-bold text-slate-800">Billets Hors-Ligne</p>
              <p className="text-[9px] text-slate-500">QR codes accessibles</p>
            </div>
            <div className="p-2.5 bg-blue-50/80 border border-blue-100 rounded-2xl space-y-1">
              <ShieldCheck className="w-4 h-4 text-blue-600 mx-auto" />
              <p className="text-[10px] font-bold text-slate-800">Poids Plume</p>
              <p className="text-[9px] text-slate-500">Moins de 2 Mo</p>
            </div>
          </div>

          {/* Error notice if prompt failed */}
          {installError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{installError}</span>
            </div>
          )}

          {/* Conditional Flow: Already Installed */}
          {isInstalled ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900">Application déjà installée !</p>
                <p className="text-[11px] text-emerald-700">
                  IwacuTix est configurée sur votre appareil. Vous pouvez y accéder directement depuis vos applications.
                </p>
              </div>
            </div>
          ) : isInIframe ? (
            /* Inside an Iframe / Preview Mode */
            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-brand-primary" />
                  Mode prévisualisation détecté
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pour des raisons de sécurité, les navigateurs interdisent l'installation des applications à l'intérieur d'une fenêtre intégrée. Ouvrez l'application dans un onglet dédié pour lancer l'installation :
                </p>
              </div>

              <button
                onClick={handleOpenInNewTab}
                className="w-full py-3.5 px-4 bg-brand-primary hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Ouvrir en plein écran pour installer
              </button>
            </div>
          ) : isIOS ? (
            /* iOS Safari Step-by-Step Guide */
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-brand-primary" />
                Installation sur iPhone & iPad (Safari) :
              </p>
              <ol className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-brand-primary font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Appuyez sur le bouton <strong>Partager</strong> <Share2 className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> au bas de l'écran Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-brand-primary font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Faites défiler et appuyez sur <strong className="inline-flex items-center gap-1">Sur l'écran d'accueil <PlusSquare className="w-3.5 h-3.5 text-slate-600 inline" /></strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-brand-primary font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Appuyez sur <strong>Ajouter</strong> en haut à droite. L'icône est prête sur votre écran d'accueil !
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            /* Android / Desktop Chrome / Edge */
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Ajoutez l'icône <strong>IwacuTix</strong> sur votre écran d'accueil pour profiter d'un affichage plein écran et d'un accès sans connexion à vos billets.
              </p>

              <button
                onClick={handleDirectInstall}
                disabled={isInstalling}
                className="w-full py-3.5 px-4 bg-brand-primary hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isInstalling ? "Ouverture de l'invite..." : "Installer l'application maintenant"}
              </button>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-slate-600">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                  Méthode alternative :
                </p>
                <p>
                  Dans le menu de votre navigateur (les 3 points <strong>⋮</strong> en haut à droite), choisissez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handleOpenInNewTab}
              className="text-xs font-semibold text-slate-600 hover:text-brand-primary flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ouvrir dans un onglet
            </button>

            <button
              onClick={onClose}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
