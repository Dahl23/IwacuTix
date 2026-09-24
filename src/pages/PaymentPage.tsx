import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, OrderDraft } from '../AppContext';
import { ChevronLeft, ShieldCheck, Lock, Smartphone, Gift, User, Zap, Ticket, AlertCircle, ArrowRight } from 'lucide-react';
import { ApiDestinataireBillet } from '../types';

const LumicashLogo = () => (
  <div className="w-16 h-10 flex items-center justify-center bg-white border border-slate-200/60 rounded-xl overflow-hidden shrink-0 shadow-sm px-1 select-none">
    <svg viewBox="0 0 120 40" className="h-6 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(4, 5) scale(0.75)">
        <path d="M10 5 C15 5, 25 15, 20 25 C16 29, 10 28, 7 24" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
        <path d="M14 9 C18 9, 27 19, 22 29" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
        <path d="M6 15 C10 12, 18 18, 18 24 C18 28, 14 31, 10 30" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" />
      </g>
      <text x="34" y="25" fontFamily="'Inter', system-ui, sans-serif" fontWeight="900" fontSize="19" fill="#1E3A8A" letterSpacing="-0.5">lumi</text>
      <text x="73" y="25" fontFamily="'Inter', system-ui, sans-serif" fontWeight="900" fontSize="19" fill="#EF4444" letterSpacing="-0.5">cash</text>
    </svg>
  </div>
);

const BlinkLogo = () => (
  <div className="w-16 h-10 flex items-center justify-center bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-xl overflow-hidden shrink-0 shadow-sm px-1 select-none">
    <div className="flex items-center gap-1">
      <Zap className="w-4 h-4 text-white fill-current" />
      <span className="font-display font-black text-white text-xs tracking-tight">blink</span>
    </div>
  </div>
);

export const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, user, events, isUserVerified, openAuthModal } = useApp();

  const paymentOptions = [
    {
      id: 'LUMICASH',
      name: 'Lumicash',
      subtitle: 'Portefeuille mobile Lumitel — confirmation OTP SMS',
      color: '#FFB300',
      borderActive: 'border-amber-500 bg-amber-50/40',
      renderLogo: () => <LumicashLogo />,
    },
    {
      id: 'LIGHTNING',
      name: 'Lightning ⚡',
      subtitle: 'Bitcoin via facture BOLT11 (Blink, Phoenix...)',
      color: '#F97316',
      borderActive: 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-400/20',
      renderLogo: () => <BlinkLogo />,
    },
  ];

  // Moyens de paiement autorisés par les tiers sélectionnés (moyens_paiement_acceptes)
  const allowedMethods = new Set<string>();
  cart.forEach((item) => {
    const evt = events.find((e) => e.id === item.eventId);
    const cat = evt?.ticketCategories.find((c) => c.name === item.categoryName);
    const accepted = cat?.moyens_paiement_acceptes || ['LUMICASH', 'LIGHTNING'];
    accepted.forEach((m) => allowedMethods.add(m));
  });
  const effectiveOptions = paymentOptions.filter((o) => allowedMethods.has(o.id));

  const [paymentMethod, setPaymentMethod] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user.phone ? user.phone.replace('+257 ', '').trim() : '');

  useEffect(() => {
    if (user.phone) {
      setPhoneNumber(user.phone.replace('+257 ', '').trim());
    }
  }, [user.phone]);

  // Forcer une méthode de paiement valide selon les moyens acceptés
  useEffect(() => {
    if (effectiveOptions.length === 0) return;
    if (!effectiveOptions.some((o) => o.id === paymentMethod)) {
      setPaymentMethod(effectiveOptions[0].id);
    }
  }, [effectiveOptions, paymentMethod]);

  // Beneficiary details states
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientHasNoPhone, setRecipientHasNoPhone] = useState(false);

  // Compute total (montant réel : somme des prix des tiers, sans frais fictifs)
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = subtotal;

  const handleConfirm = () => {
    if (!isUserVerified) {
      openAuthModal('RESERVATION');
      return;
    }
    if (effectiveOptions.length === 0) return;

    if (paymentMethod === 'LUMICASH' && !phoneNumber.trim()) {
      alert('Veuillez entrer votre numéro de téléphone Lumicash (+257...).');
      return;
    }

    if (isGift) {
      if (!recipientName.trim()) {
        alert('Veuillez entrer le nom complet de la personne qui recevra le ticket.');
        return;
      }
      if (!recipientHasNoPhone && !recipientPhone.trim()) {
        alert('Veuillez entrer le numéro de téléphone de la personne ou cocher la case s\'il n\'en a pas.');
        return;
      }
    }

    // Une commande par tier sélectionné, avec destinataires = quantite entrées exactement
    const orders: OrderDraft[] = cart.map((item) => {
      const destinataires: ApiDestinataireBillet[] = [];
      for (let i = 0; i < item.quantity; i++) {
        if (isGift) {
          destinataires.push({
            nom: recipientName.trim(),
            telephone: recipientPhone.trim() ? `+257 ${recipientPhone.trim()}` : undefined,
            sans_smartphone: recipientHasNoPhone || undefined,
          });
        } else {
          destinataires.push({
            nom: user.name || undefined,
            telephone: user.phone || undefined,
          });
        }
      }
      return {
        event_id: item.eventId,
        tier_id: item.tierId || '',
        quantite: item.quantity,
        destinataires,
      };
    });

    const fullPhone = paymentMethod === 'LUMICASH' ? `+257 ${phoneNumber.trim()}` : '';

    navigate('/paiement/confirmation', {
      state: {
        paymentMethod,
        phone: fullPhone,
        orders,
        total,
        giftDetails: {
          isGift,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim() ? `+257 ${recipientPhone.trim()}` : '',
          recipientHasNoPhone,
        },
      },
    });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#F8FAFC] overflow-hidden relative">

      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200/40"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-display font-bold text-slate-800">Moyen de paiement</span>
        <div className="w-7 h-7"></div>
      </div>

      <div className="p-4 flex-1 min-h-0 space-y-4 overflow-y-auto pb-4">
        {/* Security Assurance Banner */}
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2.5 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-brand-green shrink-0" />
          <p className="text-[11px] text-emerald-800 font-semibold">
            Règlement sécurisé via le backend IwacuTix (Lumicash ou Bitcoin Lightning).
          </p>
        </div>

        {/* Selected Tickets Summary Card */}
        {cart.length > 0 ? (
          <div className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-brand-primary" />
                Vos billets sélectionnés
              </span>
              <span className="text-[10px] font-mono text-slate-500 font-semibold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} place(s)
              </span>
            </div>
            <div className="space-y-1.5 divide-y divide-slate-50">
              {cart.map((item, idx) => (
                <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-slate-800 truncate">{item.eventTitle}</p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Catégorie : <span className="font-semibold text-slate-700">{item.categoryName}</span> (x{item.quantity})
                    </p>
                  </div>
                  <span className="font-mono font-bold text-brand-primary shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2">
            <p className="text-xs font-bold text-amber-900">Aucun billet en cours d'achat</p>
            <p className="text-[11px] text-amber-700">Veuillez d'abord choisir un événement et sélectionner vos places.</p>
            <button
              onClick={() => navigate('/home')}
              className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-primary/90 transition-all"
            >
              Parcourir les événements
            </button>
          </div>
        )}

        {/* Unverified buyer account notice */}
        {!isUserVerified && (
          <div className="p-3.5 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-200 rounded-2xl flex flex-col gap-2.5 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-orange-950">Compte acheteur obligatoire pour réserver</h4>
                <p className="text-[11px] text-orange-900/80 leading-relaxed mt-0.5">
                  Pour valider votre réservation et recevoir vos billets nominatifs avec QR Code sécurisé, vous devez renseigner votre <strong>nom, prénom</strong> et <strong>numéro de téléphone</strong> vérifié par code SMS.
                </p>
              </div>
            </div>
            <button
              onClick={() => openAuthModal('RESERVATION')}
              className="w-full py-2.5 bg-brand-primary hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Créer mon compte & Valider mon numéro</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* List Header */}
        <div className="space-y-1">
          <h3 className="text-sm font-display font-bold text-slate-800 tracking-wide uppercase">Sélectionnez votre moyen</h3>
          <p className="text-xs text-slate-500">Moyens acceptés par les billets sélectionnés.</p>
        </div>

        {/* Dynamic Cards List */}
        <div className="space-y-3">
          {effectiveOptions.map((option) => {
            const isSelected = paymentMethod === option.id;
            return (
              <div
                key={option.id}
                id={`pay-method-${option.id.toLowerCase()}`}
                onClick={() => setPaymentMethod(option.id)}
                className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer shadow-sm ${
                  isSelected
                    ? option.borderActive
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {option.renderLogo()}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{option.name}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{option.subtitle}</p>
                  </div>
                </div>

                <div className="shrink-0 pl-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-brand-primary' : 'border-slate-300'
                  }`}>
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-primary"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lumicash phone input OR Lightning infos */}
        {paymentMethod === 'LIGHTNING' ? (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-amber-50/60 border-2 border-orange-300 space-y-3 shadow-xs animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-display font-bold text-orange-950 uppercase tracking-wider flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-orange-500 text-white flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                </div>
                Règlement en Satoshis (Lightning)
              </h4>
            </div>

            <div className="bg-white/80 border border-orange-200/80 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Total en FBu</span>
                <span className="font-bold font-mono text-sm text-slate-800">{formatPrice(total)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Conversion</span>
                <span className="text-lg font-mono font-black text-orange-600 flex items-center gap-1">
                  1 FBu ≈ 3.2 SATS
                  <Zap className="w-4 h-4 fill-current text-amber-500" />
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-normal">
              À l'étape suivante, le backend générera une facture <strong>BOLT11</strong> et un <strong>QR Code dynamique</strong> (10 minutes). Scannez avec Blink, Phoenix ou tout wallet Lightning.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm">
            <h4 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-brand-primary" />
              Téléphone Lumicash
            </h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              Le backend réservera le stock puis enverra un <strong>OTP SMS</strong> sur ce numéro pour confirmation.
            </p>

            <div className="flex gap-2.5 mt-2">
              <span className="bg-slate-100 border border-slate-200 px-3.5 py-3 rounded-xl font-mono text-xs font-bold text-slate-700 flex items-center select-none">
                +257
              </span>

              <input
                type="tel"
                id="input-phone-payment"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="69 123 456"
                maxLength={12}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-mono font-bold text-sm tracking-wide focus:outline-none focus:border-brand-primary focus:bg-white transition-all placeholder-slate-400 shadow-sm"
              />
            </div>
          </div>
        )}

        {/* Beneficiary selection */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-brand-primary" />
              Bénéficiaire du billet
            </h4>
            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
              {isGift ? "CADEAU / TIERS" : "POUR MOI"}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Souhaitez-vous acheter ces billets pour vous-même ou pour une autre personne ?
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setIsGift(false)}
              className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                !isGift
                  ? 'border-brand-primary bg-indigo-50/70 text-brand-primary'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pour moi-même
            </button>
            <button
              type="button"
              id="btn-buy-for-other"
              onClick={() => setIsGift(true)}
              className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isGift
                  ? 'border-brand-primary bg-indigo-50/70 text-brand-primary'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              Pour un proche
            </button>
          </div>

          {isGift && (
            <div className="space-y-4 pt-2 border-t border-slate-100 animate-fade-in">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  Nom complet du bénéficiaire *
                </label>
                <input
                  type="text"
                  id="recipient-name-input"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ex: Jean-Marie Nduwimana"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold text-xs tracking-wide focus:outline-none focus:border-brand-primary focus:bg-white transition-all placeholder-slate-400 shadow-sm"
                />
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 cursor-pointer select-none hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  id="checkbox-no-phone"
                  checked={recipientHasNoPhone}
                  onChange={(e) => {
                    setRecipientHasNoPhone(e.target.checked);
                    if (e.target.checked) setRecipientPhone('');
                  }}
                  className="mt-0.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-800 block">
                    Le bénéficiaire n'a pas de téléphone portable
                  </span>
                  <span className="text-[9.5px] text-slate-500 block leading-normal">
                    Cochez cette case si la personne n'a pas de smartphone.
                  </span>
                </div>
              </label>

              {!recipientHasNoPhone && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                    Téléphone du bénéficiaire *
                  </label>
                  <div className="flex gap-2.5">
                    <span className="bg-slate-100 border border-slate-200 px-3.5 py-3 rounded-xl font-mono text-xs font-bold text-slate-700 flex items-center select-none">
                      +257
                    </span>
                    <input
                      type="tel"
                      id="recipient-phone-input"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="69 777 888"
                      maxLength={12}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-mono font-bold text-sm tracking-wide focus:outline-none focus:border-brand-primary focus:bg-white transition-all placeholder-slate-400 shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Pinned Bottom bar with CTA */}
      <div className="shrink-0 p-3 sm:p-3.5 bg-white/95 border-t border-slate-200/90 backdrop-blur-md flex items-center justify-between gap-3 z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase font-mono font-semibold">Total à payer</span>
          <span className="font-mono font-bold text-base sm:text-lg text-brand-primary">
            {formatPrice(total)}
          </span>
        </div>
        <button
          id="btn-confirm-payment"
          onClick={handleConfirm}
          disabled={cart.length === 0 || effectiveOptions.length === 0}
          className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 ${
            cart.length > 0 && effectiveOptions.length > 0
              ? 'bg-brand-primary hover:bg-indigo-700 text-white shadow-indigo-500/20'
              : 'bg-slate-100 text-slate-400 border border-slate-200/50 cursor-not-allowed'
          }`}
        >
          <span>Confirmer & Payer</span>
          <Lock className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};