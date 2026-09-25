import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp, OrderDraft } from '../AppContext';
import { api } from '../services/apiClient';
import { apiTicketToPurchased } from '../services/apiMappers';
import { parseApiError } from '../utils/apiErrors';
import QRCode from 'qrcode';
import {
  Smartphone, Clock, ShieldAlert, CheckCircle, Zap, AlertTriangle, Copy, Check, RefreshCcw, ArrowRight
} from 'lucide-react';

interface CreatedInvoice {
  orderId: string;
  paymentRequest?: string;
  satoshis?: number;
  montantFbu: string;
  statut: 'PENDING' | 'SUCCESS' | 'EXPIRE' | 'ECHEC' | 'ERROR';
  errorMsg?: string;
  expiresAt: string;
}

const formatFbu = (amount: string | number) => {
  const n = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  return `${n.toLocaleString('fr-FR')} FBu`;
};

export const ConfirmationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { events, refreshTicketsFromApi, clearCart, user } = useApp();

  const {
    paymentMethod,
    phone,
    orders,
    total,
  } = (location.state as {
    paymentMethod: string;
    phone?: string;
    orders?: OrderDraft[];
    total?: number;
  }) || {};

  const drafts: OrderDraft[] = orders && orders.length > 0 ? orders : [];

  const isLightning = paymentMethod === 'LIGHTNING';

  const [invoices, setInvoices] = useState<CreatedInvoice[]>([]);
  const [phase, setPhase] = useState<'CREATING' | 'WAIT' | 'CONFIRM_OTP' | 'EXPIRED' | 'ERROR'>('CREATING');
  const [message, setMessage] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(600); // 10 min (expires_at)
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const activeIndexRef = useRef(0);
  const finalizedRef = useRef(false);

  // ---- Redirection si accès direct sans brouillon ----
  useEffect(() => {
    if (drafts.length === 0) {
      navigate('/paiement', { replace: true });
    }
  }, []);

  // ---- FINALISATION : rafraîchit les billets puis bascule sur la page succès ----
  const finalize = async () => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    try {
      await refreshTicketsFromApi();
      let newTickets: ReturnType<typeof apiTicketToPurchased>[] = [];
      try {
        const res = await api.tickets.getMesBillets();
        newTickets = (res.results || []).map((b) => apiTicketToPurchased(b, events));
      } catch {}

      clearCart();
      navigate('/paiement/succes', {
        replace: true,
        state: {
          newTickets,
          total: total ?? 0,
          paymentMethod,
          isLightning,
        },
      });
    } catch {
      clearCart();
      navigate('/paiement/succes', {
        replace: true,
        state: { newTickets: [], total: total ?? 0, paymentMethod, isLightning },
      });
    }
  };

  // ---- LIGHTNING : créer la facture (une par tier) ----
  const createLightningInvoices = async () => {
    setPhase('CREATING');
    setMessage('Création des factures Lightning sur le backend…');
    try {
      const results = await Promise.all(
        drafts.map((d) =>
          api.tickets.creerCommandeLightning({ ...d, moyen_paiement: 'LIGHTNING' as const })
        )
      );
      const created: CreatedInvoice[] = results.map((r) => ({
        orderId: r.order.id,
        paymentRequest: r.paiement.paymentRequest,
        satoshis: r.paiement.satoshis ?? undefined,
        montantFbu: r.order.montant_fbu,
        statut: 'PENDING',
        expiresAt: r.order.expires_at,
      }));
      setInvoices(created);
      setMessage(null);
      setPhase('WAIT');
    } catch (err: any) {
      const parsed = parseApiError(err);
      setMessage(
        parsed.code === 'moyen_paiement_non_accepte'
          ? 'Ce tier n’accepte pas le paiement Lightning.'
          : parsed.code === 'stock_insuffisant'
          ? 'Stock insuffisant (409).'
          : parsed.message
      );
      setPhase('ERROR');
    }
  };

  // ---- LUMICASH : étape 1 (demander OTP) ----
  const requestLumicashOtp = async (index: number) => {
    setPhase('CREATING');
    setMessage('Réservation du stock et envoi de l’OTP SMS…');
    try {
      const draft = drafts[index];
      const res = await api.tickets.demanderOtpLumicash(draft);
      activeIndexRef.current = index;
      setInvoices((prev) => {
        const next = [...prev];
        next[index] = {
          orderId: res.order.id,
          montantFbu: res.order.montant_fbu,
          statut: 'PENDING',
          expiresAt: res.order.expires_at,
        };
        return next;
      });
      setMessage(res.paiement?.instruction || 'Saisissez l’OTP reçu par SMS.');
      setPhase('CONFIRM_OTP');
} catch (err: any) {
      const parsed = parseApiError(err);
      setMessage(
        parsed.code === 'stock_insuffisant'
          ? 'Stock insuffisant (409).'
          : parsed.code === 'moyen_paiement_non_accepte'
          ? 'Ce tier n’accepte pas Lumicash.'
          : parsed.message
      );
      setPhase('ERROR');
    }
  };

  // ---- LUMICASH : étape 2 (confirmer OTP) ----
  const confirmLumicashOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const idx = activeIndexRef.current;
    const inv = invoices[idx];
    if (!inv || !otp.trim()) return;
    setSubmittingOtp(true);
    setMessage(null);
    try {
      const res = await api.tickets.confirmerLumicash({ order_id: inv.orderId, otp: otp.trim() });
      if (res.order.statut === 'SUCCESS') {
        if (idx + 1 < drafts.length) {
          setOtp('');
          await requestLumicashOtp(idx + 1);
        } else {
          await finalize();
        }
      } else {
        setMessage('Commande non confirmée. Réessayez.');
      }
    } catch (err: any) {
      const parsed = parseApiError(err);
      const code = parsed.code;
      if (code === 'paiement_echoue') {
        setMessage('OTP incorrect ou paiement échoué (402). Demandez un nouvel OTP.');
      } else if (code === 'reservation_expiree') {
        setMessage('Réservation expirée (410). Relancez la commande depuis le panier.');
        setTimeout(() => navigate('/panier'), 2500);
      } else if (code === 'paiement_deja_confirme') {
        if (idx + 1 < drafts.length) await requestLumicashOtp(idx + 1);
        else await finalize();
      } else {
        setMessage(parsed.message);
      }
    } finally {
      setSubmittingOtp(false);
    }
  };

  // ---- Initialisation au montage ----
  useEffect(() => {
    if (drafts.length === 0) return;
    if (isLightning) {
      createLightningInvoices();
    } else {
      requestLumicashOtp(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- POLLING Lightning : vérifier l'état des commandes toutes les 3s (doc §6) ----
  // S'arrête définitivement dès que plus aucune facture n'est PENDING (SUCCESS/ECHEC/EXPIRE).
  const pollingInvoicesRef = useRef<CreatedInvoice[]>([]);
  pollingInvoicesRef.current = invoices;

  useEffect(() => {
    if (!isLightning || phase !== 'WAIT' || finalizedRef.current) return;
    let stopped = false;

    const tick = async () => {
      if (stopped || finalizedRef.current) return;
      const pending = pollingInvoicesRef.current.filter((i) => i && i.statut === 'PENDING');
      if (pending.length === 0) {
        stopped = true;
        clearInterval(timer);
        return;
      }
      const newStatuts: Record<string, CreatedInvoice['statut']> = {};
      let expired = false;
      for (const inv of pending) {
        try {
          const cmd = await api.tickets.getCommande(inv.orderId);
          newStatuts[inv.orderId] = cmd.statut as CreatedInvoice['statut'];
          if (cmd.statut === 'EXPIRE') expired = true;
        } catch {}
      }
      if (stopped || finalizedRef.current) return;
      setInvoices((prev) =>
        prev.map((x) =>
          x && newStatuts[x.orderId] ? { ...x, statut: newStatuts[x.orderId] } : x
        )
      );
      if (expired) {
        setMessage('Réservation de stock expirée (10 min). Veuillez relancer la commande.');
        setPhase('EXPIRED');
      }
    };

    const timer = setInterval(tick, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [isLightning, phase]);

  // ---- Détecter quand toutes les factures Lightning sont SUCCESS ----
  useEffect(() => {
    if (!isLightning || phase !== 'WAIT' || invoices.length === 0) return;
    const allDone = invoices.every((i) => i && i.statut === 'SUCCESS');
    if (allDone) finalize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, phase, isLightning]);

  // ---- QR Lightning généré en LOCAL (garde la paymentRequest privée, jamais envoyée à un tiers) ----
  useEffect(() => {
    const withRequest = invoices.filter((i) => i && i.paymentRequest);
    if (withRequest.length === 0) return;
    let cancelled = false;
    const pendingOrderIds = withRequest.map((i) => i!.orderId);
    setQrDataUrls((prev) => {
      const next = { ...prev };
      for (const id of pendingOrderIds) delete next[id];
      return next;
    });
    withRequest.forEach((inv) => {
      QRCode.toDataURL(`lightning:${inv!.paymentRequest}`, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#020617', light: '#FFFFFF' },
      })
        .then((url) => {
          if (!cancelled) {
            setQrDataUrls((prev) => ({ ...prev, [inv!.orderId]: url }));
          }
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [invoices]);

  // ---- COUNTDOWN à partir de expires_at (min des factures en attente) ----
  useEffect(() => {
    const pendingExpiries = invoices.filter((i) => i && i.statut === 'PENDING').map((i) => new Date(i.expiresAt).getTime());
    const minExpiry = pendingExpiries.length > 0 ? Math.min(...pendingExpiries) : null;
    if (!minExpiry) return;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.floor((minExpiry - Date.now()) / 1000));
      setCountdown(left);
      if (left <= 0 && phase !== 'EXPIRED') {
        setMessage('Réservation expirée. Veuillez relancer la commande.');
        setPhase('EXPIRED');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [invoices, phase]);

  const copyBolt11 = async (pr: string) => {
    try {
      await navigator.clipboard.writeText(pr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleExpired = () => {
    navigate('/panier');
  };

  if (drafts.length === 0) return null;

  const reservationMinutes = Math.floor(countdown / 60);
  const reservationSeconds = countdown % 60;
  const displayTotal = total ?? invoices.reduce((acc, i) => acc + (i ? parseFloat(i.montantFbu) || 0 : 0), 0);

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 bg-[#F8FAFC] h-full min-h-0 overflow-y-auto text-center">

      {/* 10-Minute Reservation Stock Banner */}
      <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between text-left text-amber-900 shadow-xs shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Réservation de stock active</p>
            <p className="text-[9px] text-amber-700">
              Expire dans {reservationMinutes}m {reservationSeconds < 10 ? `0${reservationSeconds}` : reservationSeconds}s
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold bg-amber-200/60 px-2 py-0.5 rounded-full text-amber-900">
          expires_at
        </span>
      </div>

      {/* Main content */}
      <div className="space-y-5 my-auto animate-fade-in flex flex-col items-center py-2">
        {phase === 'CREATING' ? (
          <>
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 border-[3px] border-brand-primary/20 rounded-full"></div>
              <div className="absolute inset-0 border-[3px] border-t-brand-primary border-l-transparent border-r-transparent border-b-transparent rounded-full animate-spin"></div>
              <Smartphone className="w-7 h-7 text-brand-primary animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-display font-bold text-slate-900 tracking-tight">
                {isLightning ? 'Création de la facture Lightning…' : 'Préparation du paiement Lumicash…'}
              </h3>
              <p className="text-xs text-brand-primary font-mono tracking-wider font-bold uppercase">
                POST /api/tickets/commandes/
              </p>
            </div>
            {message && (
              <p className="text-xs text-slate-500 max-w-[280px]">{message}</p>
            )}
          </>
        ) : phase === 'ERROR' || phase === 'EXPIRED' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-display font-bold text-slate-900 tracking-tight">
                {phase === 'EXPIRED' ? 'Réservation expirée' : 'Paiement impossible'}
              </h3>
              <p className="text-xs text-slate-500 max-w-[300px]">{message}</p>
            </div>
            <button
              onClick={handleExpired}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Retour au panier
            </button>
          </>
        ) : (
          <>
            {/* LIGHTNING : afficher la facture + QR Code */}
            {isLightning && (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-center gap-2 text-orange-600">
                  <Zap className="w-5 h-5 fill-current" />
                  <span className="text-xs font-display font-bold uppercase tracking-wider">
                    Payez en Bitcoin Lightning
                  </span>
                </div>

                {invoices.map((inv, idx) =>
                  inv && inv.paymentRequest ? (
                    <div
                      key={inv.orderId}
                      className="w-full p-4 rounded-2xl bg-white border border-orange-200 space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-100 pb-2">
                        <span>FACTURE {idx + 1}/{invoices.length}</span>
                        <span className="font-bold text-slate-800">{formatFbu(inv.montantFbu)}</span>
                      </div>

                      {qrDataUrls[inv.orderId] ? (
                        <img
                          src={qrDataUrls[inv.orderId]}
                          alt="QR Code Lightning BOLT11"
                          className="w-44 h-44 mx-auto rounded-xl border border-slate-200 bg-white"
                        />
                      ) : (
                        <div className="w-44 h-44 mx-auto flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
                          <Zap className="w-7 h-7 text-slate-300 animate-pulse" />
                        </div>
                      )}

                      <button
                        onClick={() => copyBolt11(inv.paymentRequest!)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                      >
                        <span className="font-mono text-[10px] text-slate-600 truncate flex-1 text-left">
                          {inv.paymentRequest.slice(0, 40)}…
                        </span>
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                      </button>

                      <p className="text-[11px] text-slate-600 leading-normal">
                        Scannez le QR avec <strong>Blink</strong>, <strong>Phoenix</strong> ou tout wallet Lightning.
                        Montant : <span className="font-mono font-bold text-orange-600">{inv.satoshis?.toLocaleString('fr-FR')} sats</span>
                      </p>

                      <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[10px] text-emerald-800 font-medium flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        Statut : {inv.statut === 'SUCCESS' ? 'PAYÉ ✅' : inv.statut}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )}

            {/* LUMICASH : saisie OTP */}
            {!isLightning && phase === 'CONFIRM_OTP' && (
              <form onSubmit={confirmLumicashOtp} className="w-full p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs text-left">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-brand-primary" />
                  <span className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider">
                    Confirmation Lumicash
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{message}</p>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <p className="text-[9px] text-slate-500 font-mono uppercase">Montant à confirmer</p>
                  <p className="font-mono font-bold text-brand-primary text-sm">
                    {formatFbu(invoices[activeIndexRef.current]?.montantFbu || '0')}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Téléphone : {phone || user.phone}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                    Code OTP SMS (6 chiffres)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingOtp || otp.length < 4}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {submittingOtp ? 'Validation…' : 'Confirmer le paiement'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* Récap commande en attente (Lumicash) */}
            {!isLightning && phase !== 'CONFIRM_OTP' && (
              <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-100 pb-2">
                  <span>RÉFÉRENCE COMMANDE</span>
                  <span className="font-bold text-slate-800">{invoices[0]?.orderId || '—'}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Réservation de{' '}
                  <span className="font-bold text-slate-900">{formatFbu(displayTotal)}</span>
                  {' '}en cours sur le backend…
                </p>
              </div>
            )}
          </>
        )}

        {message && (phase === 'WAIT' || phase === 'CONFIRM_OTP') && (
          <div className="w-full p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-[10px] text-indigo-800 font-medium">
            {message}
          </div>
        )}
      </div>

      {/* Polling notice footer (doc §6 — aucun appel webhook côté frontend) */}
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 shrink-0">
        <RefreshCcw className="w-3.5 h-3.5 text-slate-400" />
        <span>
          {isLightning
            ? 'Polling GET /api/tickets/commandes/{id} toutes les 3s (pas de webhook)'
            : 'POST /api/tickets/commandes/lumicash/confirmer/ (OTP)'}
        </span>
      </div>

      {phase === 'WAIT' && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Total : {formatFbu(displayTotal)} — {invoices.length} facture(s)</span>
        </div>
      )}
    </div>
  );
};