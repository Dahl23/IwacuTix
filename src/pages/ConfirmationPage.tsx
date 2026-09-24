import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useApp } from '../AppContext';
import { api } from '../services/apiClient';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  Loader2,
  QrCode,
  ShieldAlert,
  Smartphone,
  Zap,
} from 'lucide-react';
import {
  ApiCommandeOrder,
  ApiCommandePayload,
  ApiLumicashDemanderOtpResponse,
  ApiPaymentMethod,
  ApiPaiementInstruction,
} from '../types';

type ConfirmationState = {
  paymentMethod: ApiPaymentMethod;
  phone: string;
  total: number;
  orderPayload: ApiCommandePayload;
  giftDetails?: {
    isGift: boolean;
    recipientName?: string;
    recipientPhone?: string;
    recipientHasNoPhone?: boolean;
  };
};

const getErrorMessage = (err: any) => {
  if (!err) return 'Une erreur est survenue.';
  if (typeof err.error === 'string') return err.error;
  if (typeof err.detail === 'string') return err.detail;
  const firstField = Object.values(err).find((value) => Array.isArray(value)) as string[] | undefined;
  return firstField?.[0] || 'Une erreur est survenue.';
};

export const ConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshTicketsFromApi, clearCart } = useApp();

  const state = location.state as ConfirmationState | undefined;
  const paymentMethod = state?.paymentMethod || 'LUMICASH';
  const isLightning = paymentMethod === 'LIGHTNING';

  const [order, setOrder] = useState<ApiCommandeOrder | null>(null);
  const [paiement, setPaiement] = useState<ApiPaiementInstruction | null>(null);
  const [lumicashInit, setLumicashInit] = useState<ApiLumicashDemanderOtpResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmingOtp, setConfirmingOtp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollStatus, setPollStatus] = useState('Initialisation de la commande...');
  const [secondsLeft, setSecondsLeft] = useState(600);

  const total = useMemo(() => {
    if (state?.total !== undefined) return state.total;
    return Number.parseFloat(order?.montant_fbu || '0') || 0;
  }, [state?.total, order?.montant_fbu]);

  const formatPrice = (price: number) => `${price.toLocaleString('fr-FR')} FBu`;

  const finishWithTickets = async (paidOrder: ApiCommandeOrder) => {
    const newTickets = await refreshTicketsFromApi();
    clearCart();
    navigate('/paiement/succes', {
      state: {
        newTickets,
        total: Number.parseFloat(paidOrder.montant_fbu || String(total)) || total,
        paymentMethod: paidOrder.moyen_paiement === 'LIGHTNING' ? 'Lightning / Blink' : 'Lumicash',
        txHash: paidOrder.id,
        isLightning: paidOrder.moyen_paiement === 'LIGHTNING',
      },
    });
  };

  useEffect(() => {
    if (!state?.orderPayload) {
      setError('Commande impossible : informations de panier manquantes.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const createOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isLightning) {
          const response = await api.tickets.creerCommande({
            ...state.orderPayload,
            moyen_paiement: 'LIGHTNING',
          });

          if (cancelled) return;
          setOrder(response.order);
          setPaiement(response.paiement);
          setPollStatus('Facture Lightning créée. En attente du webhook Blink...');

          if (response.paiement.paymentRequest) {
            const qr = await QRCode.toDataURL(`lightning:${response.paiement.paymentRequest}`, {
              width: 320,
              margin: 2,
              color: { dark: '#020617', light: '#FFFFFF' },
            });
            if (!cancelled) setQrDataUrl(qr);
          }
        } else {
          const response = await api.tickets.demanderOtpLumicash({
            event_id: state.orderPayload.event_id,
            tier_id: state.orderPayload.tier_id,
            quantite: state.orderPayload.quantite,
            destinataires: state.orderPayload.destinataires,
          });

          if (cancelled) return;
          setLumicashInit(response);
          setOrder(response.order);
          setPaiement(response.paiement);
          setPollStatus(response.paiement.instruction || 'OTP Lumicash envoyé. Confirmez avec le code reçu.');
        }
      } catch (err: any) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    createOrder();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!order?.expires_at) return;

    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((new Date(order.expires_at).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [order?.expires_at]);

  useEffect(() => {
    if (!isLightning || !order || order.statut !== 'PENDING') return;

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const latest = await api.tickets.getCommande(order.id);
        if (cancelled) return;
        setOrder(latest);

        if (latest.statut === 'SUCCESS') {
          setPollStatus('Paiement confirmé. Chargement de vos billets...');
          window.clearInterval(interval);
          await finishWithTickets(latest);
        } else if (latest.statut === 'EXPIRE') {
          setError('La réservation a expiré. Veuillez relancer un achat.');
          window.clearInterval(interval);
        } else if (latest.statut === 'ECHEC') {
          setError('Le paiement a échoué. Veuillez relancer un achat.');
          window.clearInterval(interval);
        } else {
          setPollStatus('Toujours en attente de confirmation Blink...');
        }
      } catch (err: any) {
        if (!cancelled) setPollStatus(getErrorMessage(err));
      }
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isLightning, order?.id, order?.statut]);

  const handleCopyInvoice = async () => {
    if (!paiement?.paymentRequest) return;
    try {
      await navigator.clipboard.writeText(paiement.paymentRequest);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleConfirmLumicash = async () => {
    if (!order) return;
    if (otp.trim().length < 4) {
      setError('Entrez le code OTP Lumicash reçu par SMS.');
      return;
    }

    setConfirmingOtp(true);
    setError(null);
    try {
      const response = await api.tickets.confirmerLumicash(order.id, otp.trim());
      setOrder(response.order);
      setPollStatus(response.message);
      await finishWithTickets(response.order);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setConfirmingOtp(false);
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 bg-[#F8FAFC] h-full min-h-0 overflow-y-auto text-center">
      <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between text-left text-amber-900 shadow-xs shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Réservation de stock</p>
            <p className="text-[9px] text-amber-700">
              Expire dans {minutes}m {seconds < 10 ? `0${seconds}` : seconds}s
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold bg-amber-200/60 px-2 py-0.5 rounded-full text-amber-900">
          {order?.statut || 'INIT'}
        </span>
      </div>

      <div className="space-y-5 my-auto animate-fade-in flex flex-col items-center py-2">
        {loading ? (
          <>
            <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
            <div>
              <h3 className="text-base font-display font-bold text-slate-900 tracking-tight">Création de la commande...</h3>
              <p className="text-xs text-slate-500 mt-1">Réservation du stock et préparation du paiement.</p>
            </div>
          </>
        ) : error ? (
          <div className="w-full p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 space-y-3">
            <AlertTriangle className="w-9 h-9 mx-auto text-red-600" />
            <h3 className="text-sm font-bold">Paiement interrompu</h3>
            <p className="text-xs">{error}</p>
            <button
              onClick={() => navigate('/paiement')}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold"
            >
              Retour au paiement
            </button>
          </div>
        ) : isLightning ? (
          <>
            <div className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between gap-3">
                <div className="text-left">
                  <p className="text-[10px] font-mono font-bold uppercase text-white/80">Montant Lightning</p>
                  <p className="text-2xl font-mono font-black flex items-center gap-1">
                    {(paiement?.satoshis || paiement?.montant_sats || order?.montant_total_sats || 0).toLocaleString('fr-FR')}
                    <span className="text-sm">sats</span>
                  </p>
                </div>
                <Zap className="w-9 h-9 text-yellow-200 fill-yellow-200" />
              </div>
              <p className="text-[11px] text-white/85 text-left mt-2">Équivalent : {formatPrice(total)}</p>
            </div>

            <div className="bg-white border border-orange-200/80 rounded-3xl p-4 shadow-sm flex flex-col items-center text-center relative w-full">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code Lightning" className="w-52 h-52 object-contain" />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center bg-slate-50 rounded-2xl">
                  <QrCode className="w-10 h-10 text-slate-300" />
                </div>
              )}
              <p className="text-[11px] text-slate-600 font-medium mt-3 max-w-[260px] leading-snug">
                Scannez avec Blink ou tout wallet Lightning compatible.
              </p>
            </div>

            <div className="w-full space-y-2">
              <button
                onClick={handleCopyInvoice}
                className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <Copy className="w-3.5 h-3.5 text-orange-600" />
                {copied ? 'Facture copiée' : 'Copier la facture BOLT11'}
              </button>
              <a
                href={paiement?.paymentRequest ? `lightning:${paiement.paymentRequest}` : undefined}
                className="block w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm"
              >
                Ouvrir dans mon wallet
              </a>
            </div>

            <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 flex items-center gap-2 text-left">
              <Loader2 className="w-4 h-4 text-brand-primary animate-spin shrink-0" />
              <span>{pollStatus}</span>
            </div>
          </>
        ) : (
          <>
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-[3px] border-brand-primary/20 rounded-full" />
              <div className="absolute inset-0 border-[3px] border-t-brand-primary border-l-transparent border-r-transparent border-b-transparent rounded-full animate-spin" />
              <Smartphone className="w-7 h-7 text-brand-primary" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-display font-bold text-slate-900 tracking-tight">Confirmez l'OTP Lumicash</h3>
              <p className="text-xs text-brand-primary font-mono tracking-wider font-bold uppercase">BitLibera on-ramp</p>
            </div>

            <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-100 pb-2">
                <span>COMMANDE</span>
                <span className="font-bold text-slate-800 truncate max-w-[180px]">{order?.id}</span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {lumicashInit?.paiement.instruction || pollStatus}
              </p>
              <p className="text-sm font-mono font-bold text-brand-primary bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-200/80 tracking-wide">
                {state?.phone}
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <button
                onClick={handleConfirmLumicash}
                disabled={confirmingOtp}
                className="w-full py-3 bg-brand-primary hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {confirmingOtp ? 'Confirmation...' : 'Confirmer et émettre les billets'}
                {confirmingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 shrink-0">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
        <span>Confirmation via API backend, webhooks réservés au serveur</span>
      </div>
    </div>
  );
};
