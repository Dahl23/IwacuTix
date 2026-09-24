import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { ApiDestinataireBillet, ApiPaymentMethod } from '../types';
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Gift,
  Lock,
  ShieldCheck,
  Smartphone,
  Ticket,
  User,
  Zap,
} from 'lucide-react';

const normalizeBurundiPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('257')) return `+${digits}`;
  return `+257${digits}`;
};

export const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, user } = useApp();

  const selectedItem = cart[0];
  const acceptedMethods = selectedItem?.moyens_paiement_acceptes || ['LUMICASH', 'LIGHTNING'];
  const defaultMethod: ApiPaymentMethod = acceptedMethods.includes('LUMICASH') ? 'LUMICASH' : 'LIGHTNING';

  const [paymentMethod, setPaymentMethod] = useState<ApiPaymentMethod>(defaultMethod);
  const [phoneNumber, setPhoneNumber] = useState(user.phone.replace(/^\+257/, '').replace(/\D/g, ''));
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientHasNoPhone, setRecipientHasNoPhone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    return {
      quantity: cart.reduce((acc, item) => acc + item.quantity, 0),
      subtotal,
      total: subtotal,
    };
  }, [cart]);

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  const paymentOptions: Array<{
    id: ApiPaymentMethod;
    name: string;
    subtitle: string;
    icon: React.ElementType;
    accent: string;
  }> = [
    {
      id: 'LUMICASH',
      name: 'Lumicash',
      subtitle: 'Paiement FBu via OTP BitLibera',
      icon: Smartphone,
      accent: 'border-amber-500 bg-amber-50/70 text-amber-900',
    },
    {
      id: 'LIGHTNING',
      name: 'Lightning / Blink',
      subtitle: 'Facture BOLT11 générée par le backend',
      icon: Zap,
      accent: 'border-orange-500 bg-orange-50/70 text-orange-900',
    },
  ];

  const buildDestinataires = (): ApiDestinataireBillet[] => {
    if (!isGift) return [];

    return Array.from({ length: totals.quantity }).map(() => ({
      nom: recipientName.trim(),
      telephone: recipientHasNoPhone ? undefined : normalizeBurundiPhone(recipientPhone),
      sans_smartphone: recipientHasNoPhone,
    }));
  };

  const handleConfirm = () => {
    setError(null);

    if (!selectedItem) {
      setError("Aucun billet n'est sélectionné.");
      return;
    }

    if (!selectedItem.tierId) {
      setError("Impossible de créer la commande : identifiant du niveau de place manquant.");
      return;
    }

    if (!acceptedMethods.includes(paymentMethod)) {
      setError(`Ce billet n'accepte pas le paiement ${paymentMethod}.`);
      return;
    }

    if (paymentMethod === 'LUMICASH' && !normalizeBurundiPhone(phoneNumber)) {
      setError('Veuillez entrer le numéro Lumicash qui recevra les instructions OTP.');
      return;
    }

    if (isGift) {
      if (!recipientName.trim()) {
        setError('Veuillez entrer le nom complet du bénéficiaire.');
        return;
      }
      if (!recipientHasNoPhone && !normalizeBurundiPhone(recipientPhone)) {
        setError("Veuillez entrer le téléphone du bénéficiaire ou cochez l'option sans smartphone.");
        return;
      }
    }

    navigate('/paiement/confirmation', {
      state: {
        paymentMethod,
        phone: paymentMethod === 'LUMICASH' ? normalizeBurundiPhone(phoneNumber) : user.phone || 'Wallet Lightning',
        total: totals.total,
        orderPayload: {
          event_id: selectedItem.eventId,
          tier_id: selectedItem.tierId,
          quantite: selectedItem.quantity,
          moyen_paiement: paymentMethod,
          destinataires: buildDestinataires(),
        },
        giftDetails: {
          isGift,
          recipientName: recipientName.trim(),
          recipientPhone: recipientHasNoPhone ? '' : normalizeBurundiPhone(recipientPhone),
          recipientHasNoPhone,
        },
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#F8FAFC] overflow-hidden relative">
      <div className="px-4 py-2.5 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200/40"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-display font-bold text-slate-800">Paiement sécurisé</span>
        <div className="w-7 h-7" />
      </div>

      <div className="p-4 flex-1 min-h-0 space-y-4 overflow-y-auto pb-4">
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2.5 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-brand-green shrink-0" />
          <p className="text-[11px] text-emerald-800 font-semibold">
            Le paiement est confirmé serveur à serveur. Le navigateur ne manipule aucun secret webhook.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {selectedItem ? (
          <div className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-brand-primary" />
                Billet sélectionné
              </span>
              <span className="text-[10px] font-mono text-slate-500 font-semibold">
                {totals.quantity} place(s)
              </span>
            </div>

            <div className="flex items-center justify-between text-xs gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{selectedItem.eventTitle}</p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Catégorie : <span className="font-semibold text-slate-700">{selectedItem.categoryName}</span>
                </p>
              </div>
              <span className="font-mono font-bold text-brand-primary shrink-0">
                {formatPrice(selectedItem.price * selectedItem.quantity)}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
            <p className="text-xs font-bold text-amber-900">Aucun billet en cours d'achat</p>
            <button
              onClick={() => navigate('/home')}
              className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-primary/90 transition-all"
            >
              Parcourir les événements
            </button>
          </div>
        )}

        <div className="space-y-1">
          <h3 className="text-sm font-display font-bold text-slate-800 tracking-wide uppercase">Moyen de paiement</h3>
          <p className="text-xs text-slate-500">Seuls Lumicash et Lightning sont exposés par l'API actuelle.</p>
        </div>

        <div className="space-y-3">
          {paymentOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = paymentMethod === option.id;
            const disabled = !acceptedMethods.includes(option.id);

            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => setPaymentMethod(option.id)}
                className={`w-full p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between text-left shadow-sm ${
                  isSelected ? option.accent : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                } ${disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/70 flex items-center justify-center shrink-0">
                    <Icon className={`w-5 h-5 ${option.id === 'LIGHTNING' ? 'text-orange-500 fill-orange-500' : 'text-amber-600'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{option.name}</p>
                    <p className="text-[10px] opacity-75 truncate mt-0.5">{disabled ? 'Non accepté par ce ticket' : option.subtitle}</p>
                  </div>
                </div>

                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? 'border-brand-primary' : 'border-slate-300'
                }`}>
                  {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />}
                </span>
              </button>
            );
          })}
        </div>

        {paymentMethod === 'LUMICASH' ? (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm">
            <h4 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-brand-primary" />
              Téléphone Lumicash
            </h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              Le backend réserve le stock puis déclenche le parcours OTP BitLibera.
            </p>
            <div className="flex gap-2.5 mt-2">
              <span className="bg-slate-100 border border-slate-200 px-3.5 py-3 rounded-xl font-mono text-xs font-bold text-slate-700 flex items-center select-none">
                +257
              </span>
              <input
                type="tel"
                id="input-phone-payment"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, ''))}
                placeholder="79 123 456"
                maxLength={12}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-mono font-bold text-sm tracking-wide focus:outline-none focus:border-brand-primary focus:bg-white transition-all placeholder-slate-400 shadow-sm"
              />
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-2 shadow-sm">
            <h4 className="text-xs font-display font-bold text-orange-950 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
              Facture Lightning
            </h4>
            <p className="text-[11px] text-orange-900/80 leading-normal">
              À l'étape suivante, l'API crée une commande `PENDING` et renvoie `paymentRequest` à afficher en QR.
            </p>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-brand-primary" />
              Bénéficiaire
            </h4>
            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
              {isGift ? 'TIERS' : 'POUR MOI'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setIsGift(false)}
              className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                !isGift ? 'border-brand-primary bg-indigo-50/70 text-brand-primary' : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              Moi-même
            </button>
            <button
              type="button"
              onClick={() => setIsGift(true)}
              className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isGift ? 'border-brand-primary bg-indigo-50/70 text-brand-primary' : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              Un proche
            </button>
          </div>

          {isGift && (
            <div className="space-y-4 pt-2 border-t border-slate-100 animate-fade-in">
              <input
                type="text"
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="Nom complet du bénéficiaire"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-xs tracking-wide focus:outline-none focus:border-brand-primary focus:bg-white transition-all placeholder-slate-400 shadow-sm"
              />

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 cursor-pointer select-none hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={recipientHasNoPhone}
                  onChange={(event) => {
                    setRecipientHasNoPhone(event.target.checked);
                    if (event.target.checked) setRecipientPhone('');
                  }}
                  className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                />
                <span className="text-[11px] font-bold text-slate-800">Le bénéficiaire n'a pas de smartphone</span>
              </label>

              {!recipientHasNoPhone && (
                <div className="flex gap-2.5">
                  <span className="bg-slate-100 border border-slate-200 px-3.5 py-3 rounded-xl font-mono text-xs font-bold text-slate-700 flex items-center select-none">
                    +257
                  </span>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(event) => setRecipientPhone(event.target.value.replace(/\D/g, ''))}
                    placeholder="79 777 888"
                    maxLength={12}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-mono font-bold text-sm tracking-wide focus:outline-none focus:border-brand-primary focus:bg-white transition-all placeholder-slate-400 shadow-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 p-3 sm:p-3.5 bg-white/95 border-t border-slate-200/90 backdrop-blur-md flex items-center justify-between gap-3 flex-wrap z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[9px] text-slate-500 uppercase font-mono font-semibold">Total à payer</span>
          <span className="font-mono font-bold text-base sm:text-lg text-brand-primary truncate">
            {formatPrice(totals.total)}
          </span>
        </div>
        <button
          id="btn-confirm-payment"
          onClick={handleConfirm}
          disabled={!selectedItem}
          className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-brand-primary hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Continuer</span>
          {paymentMethod === 'LIGHTNING' ? <ArrowRight className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
