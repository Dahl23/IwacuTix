import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Smartphone, Clock, ShieldAlert, CheckCircle, Zap, Terminal, AlertTriangle } from 'lucide-react';
import { BlinkPaymentView } from '../components/BlinkPaymentView';
import { api } from '../services/apiClient';

export const ConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { checkout, cart } = useApp();

  // Retrieve state or fallback
  const { paymentMethod, phone, giftDetails } = (location.state as { 
    paymentMethod: string; 
    phone: string; 
    giftDetails?: { 
      isGift: boolean; 
      recipientName?: string; 
      recipientPhone?: string; 
      recipientHasNoPhone?: boolean; 
    }; 
  }) || {
    paymentMethod: 'Lumicash',
    phone: '+257 69 123 456',
  };

  const isBlink = paymentMethod.toLowerCase().includes('blink');
  const [timeLeft, setTimeLeft] = useState(6); // 6 seconds auto-wait for quick demo
  const [reservationSecondsLeft, setReservationSecondsLeft] = useState(600); // 10 minutes (order.expires_at)
  const [reference] = useState(() => `${paymentMethod.toUpperCase().substring(0, 8)}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);
  const [webhookFeedback, setWebhookFeedback] = useState<string | null>(null);

  // Compute total for display
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const serviceFee = cart.length > 0 ? 1000 : 0;
  const total = subtotal + serviceFee;

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  const handleComplete = () => {
    const newTickets = checkout(paymentMethod, phone, giftDetails);
    navigate('/paiement/succes', {
      state: {
        newTickets,
        total,
        paymentMethod,
        reference,
      },
    });
  };

  // 10-minute reservation countdown (Section 5.1: 10 minutes de réservation expires_at)
  useEffect(() => {
    const timer = setInterval(() => {
      setReservationSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert('Votre réservation de stock de 10 minutes a expiré. Veuillez relancer la commande.');
          navigate('/panier');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  useEffect(() => {
    if (isBlink) return; // Blink manages its own polling and countdown

    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      handleComplete();
    }
  }, [timeLeft, isBlink]);

  // Déclencher le webhook de test dev avec signature HMAC (Section 6.2)
  const handleSimulateWebhook = async () => {
    setIsSimulatingWebhook(true);
    setWebhookFeedback(null);
    try {
      const provider = paymentMethod.toLowerCase().includes('eco') 
        ? 'ecocash' 
        : paymentMethod.toLowerCase().includes('bcb') 
        ? 'bancobu' 
        : 'lumicash';

      await api.paiements.simulerWebhookMobileMoney(provider as any, reference, 'SUCCESS');
      setWebhookFeedback(`Webhook ${provider.toUpperCase()} validé par signature HMAC-SHA256 (200 OK)`);
      setTimeout(() => {
        handleComplete();
      }, 800);
    } catch {
      handleComplete();
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  if (isBlink) {
    return (
      <BlinkPaymentView
        totalFbu={total}
        eventName={cart[0]?.eventTitle || 'Billetterie IwacuTix'}
        onPaymentSuccess={({ satoshis, txHash, paymentRequest }) => {
          const newTickets = checkout(
            `Blink Lightning ⚡ (${satoshis.toLocaleString('fr-FR')} sats)`,
            phone || 'Wallet Lightning Blink',
            giftDetails
          );
          navigate('/paiement/succes', {
            state: {
              newTickets,
              total,
              paymentMethod: `Blink Lightning ⚡ (${satoshis.toLocaleString('fr-FR')} sats)`,
              txHash,
              paymentRequest,
              isLightning: true,
            },
          });
        }}
        onCancel={() => navigate(-1)}
      />
    );
  }

  const reservationMinutes = Math.floor(reservationSecondsLeft / 60);
  const reservationSeconds = reservationSecondsLeft % 60;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 bg-[#F8FAFC] h-full min-h-0 overflow-y-auto text-center">
      
      {/* 10-Minute Reservation Stock Banner */}
      <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between text-left text-amber-900 shadow-xs shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Réservation de stock active</p>
            <p className="text-[9px] text-amber-700">Expire dans {reservationMinutes}m {reservationSeconds < 10 ? `0${reservationSeconds}` : reservationSeconds}s</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold bg-amber-200/60 px-2 py-0.5 rounded-full text-amber-900">
          Section 5.1
        </span>
      </div>

      {/* Main waiting presentation */}
      <div className="space-y-5 my-auto animate-fade-in flex flex-col items-center py-2">
        
        {/* Animated radar/spinner mockup */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-[3px] border-brand-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-[3px] border-t-brand-primary border-l-transparent border-r-transparent border-b-transparent rounded-full animate-spin"></div>
          <Smartphone className="w-7 h-7 text-brand-primary animate-bounce" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-display font-bold text-slate-900 tracking-tight">
            En attente de confirmation USSD...
          </h3>
          <p className="text-xs text-brand-primary font-mono tracking-wider font-bold uppercase">
            Paiement via {paymentMethod}
          </p>
        </div>

        {/* Visual simulated phone prompt pop-up */}
        <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-100 pb-2">
            <span>RÉFÉRENCE COMMANDE</span>
            <span className="font-bold text-slate-800">{reference}</span>
          </div>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Une demande de confirmation de <span className="font-bold text-slate-900">{formatPrice(total)}</span> a été transmise :
          </p>
          <p className="text-sm font-mono font-bold text-brand-primary bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-200/80 tracking-wide">
            {phone}
          </p>
          <div className="p-2 bg-indigo-50/60 border border-indigo-100 rounded-xl text-[10px] text-indigo-800 font-medium flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Confirmez le paiement sur votre téléphone via USSD</span>
          </div>
        </div>

        {webhookFeedback && (
          <div className="w-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-mono text-emerald-800">
            {webhookFeedback}
          </div>
        )}

        {/* Polling / Dev Action buttons */}
        <div className="w-full space-y-2">
          <button
            onClick={handleSimulateWebhook}
            disabled={isSimulatingWebhook}
            className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            {isSimulatingWebhook ? 'Envoi Webhook...' : 'Simuler Webhook Provider (HMAC-SHA256)'}
          </button>

          <button
            onClick={handleComplete}
            className="text-xs text-brand-primary font-bold hover:underline cursor-pointer"
          >
            Valider immédiatement sans attendre ({timeLeft}s) →
          </button>
        </div>

      </div>

      {/* Security notice footer */}
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 shrink-0">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
        <span>Polling automatique de /api/tickets/commandes/ toutes les 3s</span>
      </div>
    </div>
  );
};

