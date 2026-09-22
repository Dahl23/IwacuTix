import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Ticket, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { TicketPurchased } from '../types';

export const SuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve state parameters passed from ConfirmationPage
  const { newTickets, total, paymentMethod, txHash, isLightning } = (location.state as {
    newTickets: TicketPurchased[];
    total: number;
    paymentMethod: string;
    txHash?: string;
    isLightning?: boolean;
  }) || {
    newTickets: [] as TicketPurchased[],
    total: 0,
    paymentMethod: 'Lumicash',
  };

  const isBlinkPayment = isLightning || paymentMethod.toLowerCase().includes('blink');

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  const handleViewTickets = () => {
    navigate('/mes-billets');
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 bg-[#F8FAFC] h-full min-h-0 overflow-y-auto">
      {/* Spacer */}
      <div></div>

      {/* Celebration Content */}
      <div className="space-y-4 my-auto text-center flex flex-col items-center animate-fade-in py-2">
        
        {/* Big pulsing success badge */}
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
          <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14 text-brand-green relative z-10 stroke-[2.2]" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-display font-bold text-slate-900 tracking-tight">
            Achat confirmé !
          </h2>
          <p className="text-[10px] sm:text-xs text-brand-green font-mono font-bold tracking-widest uppercase">
            MURAKOZE CANE • PAYÉ SÉCURISÉ
          </p>
        </div>

        <p className="text-xs text-slate-600 max-w-[280px] leading-relaxed font-normal">
          Félicitations, vos billets digitaux IwacuTix ont été émis avec succès. Ils sont désormais disponibles dans vos réservations.
        </p>

        {/* Invoice Summary Box */}
        <div className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2.5 text-left text-xs shadow-xs">
          {newTickets.length > 0 && newTickets[0].isGift && (
            <div className="flex justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Bénéficiaire (Cadeau)</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/50">
                {newTickets[0].recipientName}
                {newTickets[0].recipientHasNoPhone && " (Sans portable)"}
              </span>
            </div>
          )}

          <div className="flex justify-between pb-2 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Mode de paiement</span>
            <span className={`font-bold font-mono flex items-center gap-1 ${
              isBlinkPayment ? 'text-orange-600' : 'text-slate-800'
            }`}>
              {isBlinkPayment && <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />}
              {paymentMethod}
            </span>
          </div>

          {txHash && (
            <div className="flex justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Réf. Lightning</span>
              <span className="font-mono text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                {txHash}
              </span>
            </div>
          )}

          <div className="flex justify-between pb-2 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Montant total débité</span>
            <span className="font-mono font-bold text-brand-primary">{formatPrice(total)}</span>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 font-medium block">Vos codes tickets ({newTickets.length}) :</span>
            <div className="flex flex-wrap gap-1">
              {newTickets.length > 0 ? (
                newTickets.map((t) => (
                  <span 
                    key={t.id} 
                    className="font-mono text-[10px] font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200"
                  >
                    {t.id}
                  </span>
                ))
              ) : (
                <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                  BTK-9812-A3
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Security confirmation tag */}
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
          <span>BILLETS DIGITAUX CRYPTÉS ET SÉCURISÉS</span>
        </div>

      </div>

      {/* Sticky Bottom Actions */}
      <div className="mt-auto pt-2 space-y-2 shrink-0">
        <button
          id="btn-success-view-tickets"
          onClick={handleViewTickets}
          className="w-full py-3 px-5 rounded-xl bg-brand-primary hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all"
        >
          <span>Accéder à mon billet</span>
          <Ticket className="w-4 h-4" />
        </button>

        <button
          onClick={() => navigate('/home')}
          className="w-full py-2 text-slate-500 hover:text-slate-800 font-bold text-xs tracking-wider uppercase cursor-pointer"
        >
          Retourner à l'accueil
        </button>
      </div>
    </div>
  );
};
