import React, { useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import { 
  X, 
  Ticket, 
  ShoppingBag, 
  CreditCard, 
  CheckCircle2, 
  Smartphone, 
  Calendar,
  QrCode
} from 'lucide-react';

import { EventDetailsPage } from '../pages/EventDetailsPage';
import { TicketSelectionPage } from '../pages/TicketSelectionPage';
import { CartPage } from '../pages/CartPage';
import { PaymentPage } from '../pages/PaymentPage';
import { ConfirmationPage } from '../pages/ConfirmationPage';
import { SuccessPage } from '../pages/SuccessPage';
import { TicketDetailPage } from '../pages/TicketDetailPage';

interface PurchaseCardOverlayProps {
  onClose: () => void;
}

export const isPurchaseRoute = (pathname: string): boolean => {
  return (
    pathname.startsWith('/evenement/') ||
    pathname === '/panier' ||
    pathname.startsWith('/paiement') ||
    pathname.startsWith('/billet/')
  );
};

export const PurchaseCardOverlay: React.FC<PurchaseCardOverlayProps> = ({ onClose }) => {
  const location = useLocation();
  const pathname = location.pathname;

  // Listen to Escape key to close the detached card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Compute step label and icon based on current path
  const getStepInfo = () => {
    if (pathname.startsWith('/evenement/') && !pathname.endsWith('/billets')) {
      return {
        stepNumber: 1,
        totalSteps: 4,
        title: "Détails de l'événement",
        subtitle: "Aperçu & Tarifs des places",
        icon: Calendar,
      };
    }
    if (pathname.includes('/billets')) {
      return {
        stepNumber: 2,
        totalSteps: 4,
        title: "Choix des billets",
        subtitle: "Sélection des catégories & quantités",
        icon: Ticket,
      };
    }
    if (pathname === '/panier') {
      return {
        stepNumber: 3,
        totalSteps: 4,
        title: "Panier d'achat",
        subtitle: "Récapitulatif de la commande",
        icon: ShoppingBag,
      };
    }
    if (pathname === '/paiement') {
      return {
        stepNumber: 4,
        totalSteps: 4,
        title: "Paiement sécurisé",
        subtitle: "Blink Lightning ⚡, Lumicash, EcoCash",
        icon: CreditCard,
      };
    }
    if (pathname === '/paiement/confirmation') {
      return {
        stepNumber: 4,
        totalSteps: 4,
        title: "Validation en cours",
        subtitle: "Réseau Lightning / Mobile Money",
        icon: Smartphone,
      };
    }
    if (pathname === '/paiement/succes') {
      return {
        stepNumber: 4,
        totalSteps: 4,
        title: "Achat Confirmé",
        subtitle: "Vos billets officiels sont prêts",
        icon: CheckCircle2,
      };
    }
    if (pathname.startsWith('/billet/')) {
      return {
        stepNumber: 4,
        totalSteps: 4,
        title: "Billet Électronique",
        subtitle: "Pass QR Code d'accès rapide",
        icon: QrCode,
      };
    }
    return {
      stepNumber: 1,
      totalSteps: 4,
      title: "Réservation IwacuTix",
      subtitle: "Billetterie en ligne sécurisée",
      icon: Ticket,
    };
  };

  const stepInfo = getStepInfo();
  const Icon = stepInfo.icon;

  return (
    <div
      id="purchase-card-backdrop"
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-hidden animate-backdrop-fade"
      onClick={onClose}
    >
      {/* Outer Floating Dismiss Pill on Top Right (Desktop / Tablet) */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-5 sm:right-6 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer z-[75] shadow-lg hidden md:flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 group"
        title="Fermer la carte et revenir à la page principale (Échap)"
      >
        <X className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-200" />
        <span>Fermer la carte</span>
        <span className="text-[10px] font-mono opacity-70 bg-black/40 px-1.5 py-0.5 rounded">Échap</span>
      </button>

      {/* The Detached Card Modal - Reduced to a compact, elegant handheld format */}
      <div
        id="detached-purchase-card"
        className="relative z-[75] w-full max-w-[430px] sm:max-w-[460px] h-[92vh] sm:h-[84vh] max-h-[730px] bg-[#F8FAFC] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(249,115,22,0.35)] border border-orange-200/70 flex flex-col overflow-hidden animate-card-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header of the Detached Card */}
        <div className="px-3.5 sm:px-4 py-2 bg-white/95 border-b border-orange-200/50 backdrop-blur-xl flex items-center justify-between shrink-0 select-none">
          {/* Left: Step indicator */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-orange-500/15 text-orange-950 border border-orange-300/40 shrink-0">
              <Icon className="w-3.5 h-3.5 text-orange-600" />
            </span>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-xs font-display font-bold text-slate-900 truncate">{stepInfo.title}</span>
                <span className="text-[9px] font-mono font-bold bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded-full border border-orange-200/60 shrink-0">
                  {stepInfo.stepNumber}/{stepInfo.totalSteps}
                </span>
              </div>
              <span className="text-[9.5px] text-slate-500 truncate">{stepInfo.subtitle}</span>
            </div>
          </div>

          {/* Right: Step dots + Close button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Step progression dots */}
            <div className="flex items-center gap-1">
              {Array.from({ length: stepInfo.totalSteps }).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx + 1 <= stepInfo.stepNumber
                      ? 'w-3.5 bg-orange-500'
                      : 'w-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Inner Close Button */}
            <button
              id="btn-close-purchase-card-inner"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-100/80 text-slate-600 hover:text-orange-950 border border-slate-200/70 cursor-pointer transition-all active:scale-90 flex items-center gap-1"
              title="Fermer la carte"
            >
              <X className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Fermer</span>
            </button>
          </div>
        </div>

        {/* Scrollable interior containing the purchase route */}
        <div className="flex-1 min-h-0 relative flex flex-col w-full h-full bg-[#F8FAFC] overflow-hidden">
          <Routes location={location}>
            <Route path="/evenement/:id" element={<EventDetailsPage />} />
            <Route path="/evenement/:id/billets" element={<TicketSelectionPage />} />
            <Route path="/panier" element={<CartPage />} />
            <Route path="/paiement" element={<PaymentPage />} />
            <Route path="/paiement/confirmation" element={<ConfirmationPage />} />
            <Route path="/paiement/succes" element={<SuccessPage />} />
            <Route path="/billet/:id" element={<TicketDetailPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};
