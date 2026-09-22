import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { ChevronLeft, Plus, Minus, Ticket, Info } from 'lucide-react';

export const TicketSelectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, addToCart, clearCart } = useApp();

  const event = events.find((evt) => evt.id === id);

  // Maintain local state of selected quantities
  // e.g. { "Pelouse": 2, "VIP": 0 }
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  if (!event) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC] h-full">
        <Info className="w-12 h-12 text-brand-primary mb-4" />
        <h3 className="text-lg font-display font-bold text-slate-900">Événement introuvable</h3>
        <button
          onClick={() => navigate('/home')}
          className="mt-6 px-6 py-2 bg-brand-primary rounded-xl text-white font-semibold shadow-sm"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  const handleIncrement = (categoryName: string) => {
    setQuantities((prev) => ({
      ...prev,
      [categoryName]: (prev[categoryName] || 0) + 1,
    }));
  };

  const handleDecrement = (categoryName: string) => {
    setQuantities((prev) => {
      const current = prev[categoryName] || 0;
      if (current <= 0) return prev;
      return {
        ...prev,
        [categoryName]: current - 1,
      };
    });
  };

  // Compute total tickets and price
  const totalQuantity = Object.keys(quantities).reduce((acc, key) => acc + (quantities[key] || 0), 0);
  const totalPrice = event.ticketCategories.reduce((acc, cat) => {
    const qty = quantities[cat.name] || 0;
    return acc + qty * cat.price;
  }, 0);

  const handleContinue = () => {
    if (totalQuantity === 0) return;

    // Clear previous cart to start fresh purchase for this event
    clearCart();

    // Add all selected items to context cart
    event.ticketCategories.forEach((cat) => {
      const qty = quantities[cat.name] || 0;
      if (qty > 0) {
        addToCart(event.id, event.title, cat.name, qty, cat.price);
      }
    });

    // Navigate to the basket summary page
    navigate('/panier');
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#F8FAFC] overflow-hidden relative">
      
      {/* Top Header */}
      <div className="px-4 py-2.5 flex items-center justify-between shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200/40"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-display font-bold text-slate-800">Sélection des billets</span>
        <div className="w-7 h-7"></div> {/* balance spacer */}
      </div>

      {/* Main Content Area */}
      <div className="p-4 flex-1 min-h-0 space-y-4 overflow-y-auto pb-4">
        {/* Brief Event Summary Banner */}
        <div className="flex gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm">
          <img 
            referrerPolicy="no-referrer"
            src={event.imageUrl} 
            alt={event.title} 
            className="w-14 h-14 rounded-xl object-cover shrink-0" 
          />
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <h4 className="text-xs font-display font-bold text-slate-800 leading-tight truncate">{event.title}</h4>
            <p className="text-[10px] text-brand-primary font-mono mt-1 font-bold">{event.date}</p>
          </div>
        </div>

        {/* Ticket List Header */}
        <div className="space-y-1">
          <h3 className="text-sm font-display font-bold text-slate-800 tracking-wide uppercase">Catégories de billets</h3>
          <p className="text-xs text-slate-500">Choisissez le nombre de places souhaité pour chaque catégorie.</p>
        </div>

        {/* Categories list */}
        <div className="space-y-4">
          {event.ticketCategories.map((cat, idx) => {
            const qty = quantities[cat.name] || 0;
            return (
              <div
                key={idx}
                id={`ticket-category-row-${cat.name.toLowerCase().replace(' ', '-')}`}
                className={`p-4 rounded-2xl border transition-all shadow-sm ${
                  qty > 0 
                    ? 'bg-indigo-50/50 border-brand-primary/40' 
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm text-slate-900">{cat.name}</span>
                      {qty > 0 && (
                        <span className="text-[9px] font-mono font-bold bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full border border-brand-primary/20">
                          SÉLECTIONNÉ
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-[11px] text-slate-500 leading-normal">{cat.description}</p>
                    )}
                    <p className="text-xs font-mono font-bold text-brand-primary pt-1">
                      {formatPrice(cat.price)}
                    </p>
                  </div>

                  {/* Quantity adjustment controls */}
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-200/80 shrink-0">
                    <button
                      onClick={() => handleDecrement(cat.name)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        qty > 0 ? 'bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-100 active:scale-90' : 'text-slate-300'
                      }`}
                      disabled={qty === 0}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    
                    <span className="w-5 text-center font-mono text-sm font-bold text-slate-800">
                      {qty}
                    </span>

                    <button
                      onClick={() => handleIncrement(cat.name)}
                      className="w-7 h-7 rounded-lg bg-brand-primary hover:bg-indigo-700 text-white flex items-center justify-center shadow-sm shadow-indigo-600/10 active:scale-90 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Additional indicator of remaining spots */}
                <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-slate-100 text-[9px] font-mono text-slate-400">
                  <span>PLACES DISPONIBLES</span>
                  <span className="font-bold text-slate-600">{cat.available} places</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pinned Sticky footer with computation summary */}
      <div className="shrink-0 p-3 sm:p-3.5 bg-white/95 border-t border-slate-200/90 backdrop-blur-md flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-20">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase font-mono font-semibold">Billet{totalQuantity > 1 ? 's' : ''} : {totalQuantity}</span>
          <span className="font-mono font-bold text-base sm:text-lg text-brand-primary">
            {formatPrice(totalPrice)}
          </span>
        </div>
        <button
          id="btn-ticket-continue"
          onClick={handleContinue}
          disabled={totalQuantity === 0}
          className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            totalQuantity > 0
              ? 'bg-brand-primary text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 active:scale-95'
              : 'bg-slate-100 text-slate-400 border border-slate-200/50 cursor-not-allowed'
          }`}
        >
          <span>Continuer</span>
          <Ticket className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
