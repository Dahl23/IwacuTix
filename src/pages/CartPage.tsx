import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { ChevronLeft, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, updateCartQuantity, removeFromCart } = useApp();

  const handleIncrement = (eventId: string, categoryName: string, currentQty: number) => {
    updateCartQuantity(eventId, categoryName, currentQty + 1);
  };

  const handleDecrement = (eventId: string, categoryName: string, currentQty: number) => {
    updateCartQuantity(eventId, categoryName, currentQty - 1);
  };

  // Compute values
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const serviceFee = cart.length > 0 ? 1000 : 0; // 1000 FBu service fee
  const total = subtotal + serviceFee;

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
        <span className="text-xs font-display font-bold text-slate-800">Récapitulatif de commande</span>
        <div className="w-7 h-7"></div> {/* balance spacer */}
      </div>

      {cart.length === 0 ? (
        // Empty State
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 text-center my-auto">
          <div className="p-4 rounded-full bg-slate-100 text-slate-400 mb-3 border border-slate-200/60">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h3 className="text-base font-display font-bold text-slate-800">Votre panier est vide</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed font-normal">
            Vous n'avez pas encore sélectionné de billets pour votre panier d'achat.
          </p>
          <button
            onClick={() => navigate('/home')}
            className="mt-5 px-5 py-2.5 bg-brand-primary hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all shadow-sm"
          >
            Découvrir des événements
          </button>
        </div>
      ) : (
        // Cart Items
        <div className="p-4 flex-1 min-h-0 space-y-4 overflow-y-auto pb-4">
          
          {/* Basket List */}
          <div className="space-y-4">
            {cart.map((item, idx) => (
              <div
                key={idx}
                id={`cart-item-${idx}`}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3.5"
              >
                {/* Event & Category title */}
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-xs font-display font-bold text-slate-800 leading-snug line-clamp-2">
                      {item.eventTitle}
                    </h4>
                    <span className="inline-block text-[9px] font-mono font-bold bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full border border-brand-primary/20">
                      Catégorie : {item.categoryName}
                    </span>
                  </div>
                  
                  {/* Delete Row button */}
                  <button
                    onClick={() => removeFromCart(item.eventId, item.categoryName)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Adjustments and math row */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2.5 bg-slate-50 rounded-lg p-0.5 border border-slate-200/80">
                    <button
                      onClick={() => handleDecrement(item.eventId, item.categoryName, item.quantity)}
                      className="w-6 h-6 rounded-md bg-white text-slate-700 border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer active:scale-90 transition-all font-bold"
                    >
                      -
                    </button>
                    <span className="w-4 text-center font-mono text-xs font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleIncrement(item.eventId, item.categoryName, item.quantity)}
                      className="w-6 h-6 rounded-md bg-brand-primary text-white flex items-center justify-center cursor-pointer active:scale-90 transition-all font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* Pricing detail */}
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-mono font-medium">{item.quantity} x {formatPrice(item.price)}</p>
                    <p className="font-mono font-bold text-sm text-brand-primary mt-0.5">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Breakdown Card */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3.5 shadow-sm">
            <h4 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wide">Détails de la facture</h4>
            
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Sous-total</span>
                <span className="font-mono text-slate-900 font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  Frais de service IwacuTix
                  <span className="text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">TVA Incl.</span>
                </span>
                <span className="font-mono text-slate-900 font-semibold">{formatPrice(serviceFee)}</span>
              </div>
              
              <div className="border-t border-slate-100 pt-3 flex justify-between items-end">
                <span className="font-display font-bold text-sm text-slate-800">Total à payer</span>
                <span className="font-mono font-bold text-base text-brand-primary">
                  {formatPrice(total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Bottom bar with CTA */}
      {cart.length > 0 && (
        <div className="shrink-0 p-3.5 sm:p-4 bg-white/95 border-t border-slate-200/90 backdrop-blur-md z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <button
            id="btn-cart-pay"
            onClick={() => navigate('/paiement')}
            className="w-full py-3 sm:py-3.5 px-6 rounded-xl bg-brand-primary hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all"
          >
            <span>Procéder au paiement</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
