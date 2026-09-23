import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Ticket, Calendar, MapPin, ChevronRight, Inbox } from 'lucide-react';

export const MyTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const { tickets } = useApp();

  const [activeTab, setActiveTab] = useState<'valide' | 'utilise'>('valide');

  const filteredTickets = tickets.filter((t) => t.status === activeTab);

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      
      {/* Top Header */}
      <div className="px-5 pt-4 pb-1 sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">Portefeuille de Billets</h2>
          <span className="text-[10px] font-mono bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-1 rounded-full font-bold uppercase">
            SECURE ACCESS
          </span>
        </div>

        {/* Clickable tabs for filter */}
        <div className="flex border-b border-slate-100 mt-4.5">
          <button
            id="tab-tickets-active"
            onClick={() => setActiveTab('valide')}
            className={`flex-1 text-center pb-3 text-xs font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === 'valide'
                ? 'border-orange-500 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            À venir ({tickets.filter((t) => t.status === 'valide').length})
          </button>
          
          <button
            id="tab-tickets-past"
            onClick={() => setActiveTab('utilise')}
            className={`flex-1 text-center pb-3 text-xs font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
              activeTab === 'utilise'
                ? 'border-orange-500 text-orange-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Historique ({tickets.filter((t) => t.status === 'utilise').length})
          </button>
        </div>
      </div>

      {/* Main Content Scroll List */}
      <div className="p-5 flex-1 space-y-4 overflow-y-auto">
        {filteredTickets.length === 0 ? (
          /* High contrast visual empty state */
          <div className="py-16 text-center my-auto flex flex-col items-center justify-center">
            <div className="p-5 rounded-full bg-slate-100 text-slate-400 mb-4 border border-slate-200">
              <Inbox className="w-10 h-10" />
            </div>
            <h3 className="text-sm font-display font-bold text-slate-800">Aucun billet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-[220px] leading-relaxed">
              Vous n'avez aucun billet enregistré dans l'onglet "{activeTab === 'valide' ? 'À venir' : 'Historique'}".
            </p>
            {activeTab === 'valide' && (
              <button
                onClick={() => navigate('/home')}
                className="mt-6 px-6 py-3 bg-iwacu-gradient hover:opacity-95 text-white font-btn text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 cursor-pointer active:scale-95 transition-all"
              >
                Trouver des événements
              </button>
            )}
          </div>
        ) : (
          /* Cards list */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                id={`ticket-card-row-${t.id}`}
                onClick={() => navigate(`/billet/${t.id}`)}
                className="p-3.5 bg-white hover:bg-slate-50/50 border border-slate-200 rounded-2xl flex items-center gap-4 cursor-pointer group transition-all active:scale-99 shadow-sm hover:border-orange-300"
              >
                {/* Visual stub resembling ticket notches */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-slate-400">
                      ID : {t.id}
                    </span>
                    <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      t.status === 'valide' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-slate-100 text-slate-500 border-slate-200/60'
                    }`}>
                      {t.status === 'valide' ? 'Valide' : 'Utilisé'}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-sm text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                    {t.eventTitle}
                  </h4>

                  <div className="space-y-1 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate">{t.eventDate} • {t.eventTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{t.eventLocation.split(',')[0]}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400 uppercase">Catégorie</span>
                    <span className="font-bold text-slate-800">{t.categoryName} ({formatPrice(t.price)})</span>
                  </div>
                </div>

                {/* Right caret */}
                <div className="p-1 rounded-lg bg-slate-50 text-slate-400 border border-slate-100 group-hover:text-slate-700 transition-colors shrink-0">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
