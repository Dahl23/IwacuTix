import React from 'react';
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
  ExternalLink
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { hasPrompt, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with App Logo & Close */}
        <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white p-1 shadow-lg border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
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
              <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold">
                Application Mobile & Web
              </span>
              <h2 className="text-xl font-display font-black text-white leading-tight">
                Iwacu<span className="text-brand-primary">Tix</span> Burundi
              </h2>
              <p className="text-xs text-slate-300">
                Installez l'app sur votre téléphone
              </p>
            </div>
          </div>
        </div>

        {/* Benefits list */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 bg-orange-50/70 border border-orange-100 rounded-xl space-y-1">
              <Zap className="w-4 h-4 text-brand-primary mx-auto" />
              <p className="text-[10px] font-bold text-slate-800">100% Fluide</p>
              <p className="text-[9px] text-slate-500">Ouverture instantanée</p>
            </div>
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
              <WifiOff className="w-4 h-4 text-emerald-600 mx-auto" />
              <p className="text-[10px] font-bold text-slate-800">Billets Hors-Ligne</p>
              <p className="text-[9px] text-slate-500">QR codes accessibles</p>
            </div>
            <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
              <ShieldCheck className="w-4 h-4 text-blue-600 mx-auto" />
              <p className="text-[10px] font-bold text-slate-800">Légère</p>
              <p className="text-[9px] text-slate-500">Moins de 2 Mo</p>
            </div>
          </div>

          {/* Installation method display */}
          {isInstalled ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900">Application déjà installée !</p>
                <p className="text-[11px] text-emerald-700">
                  IwacuTix est déjà configuré sur votre écran d'accueil.
                </p>
              </div>
            </div>
          ) : hasPrompt ? (
            /* Direct Chrome / Android / Edge 1-click install */
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Cliquez ci-dessous pour ajouter directement l'icône <strong>IwacuTix</strong> sur votre écran d'accueil sans passer par les stores.
              </p>
              <button
                onClick={handleDirectInstall}
                className="w-full py-3.5 px-4 bg-brand-primary hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Installer l'application maintenant
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
                    Appuyez sur le bouton <strong>Partager</strong> <Share2 className="w-3.5 h-3.5 inline text-blue-600 mx-0.5" /> dans la barre Safari en bas de l'écran.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-brand-primary font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Faites défiler vers le bas et sélectionnez <strong className="inline-flex items-center gap-1">Sur l'écran d'accueil <PlusSquare className="w-3.5 h-3.5 text-slate-600 inline" /></strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-brand-primary font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Appuyez sur <strong>Ajouter</strong> en haut à droite. L'icône IwacuTix est prête !
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            /* General browser guide */
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-brand-primary" />
                Installation manuelle :
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dans le menu de votre navigateur (les 3 petits points <strong>⋮</strong> en haut à droite sur Chrome ou le menu Partager), cliquez sur <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
              </p>
            </div>
          )}

          <div className="pt-1">
            <button
              onClick={onClose}
              className="w-full py-2.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
