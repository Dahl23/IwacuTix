import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Ticket, Calendar, MapPin, ChevronRight, Inbox, Lock, Sparkles, ArrowRight, RefreshCcw, QrCode, User, ShoppingBag, Clock, CheckCircle2, XCircle, Hourglass, Loader2, Wallet } from 'lucide-react';
import { api } from '../services/apiClient';
import { ApiCommandeOrder } from '../types';

const COMMANDE_STATUT_META: Record<ApiCommandeOrder['statut'], { label: string; className: string; Icon: typeof Clock }> = {
  PENDING: { label: 'En attente', className: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Hourglass },
  SUCCESS: { label: 'Réussie', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  ECHEC: { label: 'Échec', className: 'bg-rose-50 text-rose-700 border-rose-200', Icon: XCircle },
  EXPIRE: { label: 'Expirée', className: 'bg-slate-100 text-slate-500 border-slate-200', Icon: Clock },
};

const CANAL_LABEL: Record<string, string> = {
  LUMICASH: 'Lumicash',
  LIGHTNING: 'Lightning',
  ECOCASH: 'Ecocash',
  BANCOBU: 'Bancobu',
  IHELA: 'Ihela',
};

export const MyTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const { tickets, isUserVerified, openAuthModal, refreshTicketsFromApi } = useApp();

  const [activeTab, setActiveTab] = useState<'valide' | 'historique' | 'commandes'>('valide');
  const [refreshing, setRefreshing] = useState(false);

  // Commandes (getCommandes - pagifié)
  const [commandes, setCommandes] = useState<ApiCommandeOrder[]>([]);
  const [commandesLoading, setCommandesLoading] = useState(false);
  const [commandesNext, setCommandesNext] = useState<string | null>(null);
  const [commandesNextLoading, setCommandesNextLoading] = useState(false);

  // Recharger les billets depuis /api/tickets/mes-billets/ dès qu'un compte est vérifié
  useEffect(() => {
    if (!isUserVerified) return;
    let cancelled = false;
    setRefreshing(true);
    refreshTicketsFromApi().finally(() => {
      if (!cancelled) setRefreshing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isUserVerified, refreshTicketsFromApi]);

  const loadCommandes = async (page?: number, append = false) => {
    if (!isUserVerified) return;
    if (append) setCommandesNextLoading(true);
    else setCommandesLoading(true);
    try {
      const res = await api.tickets.getCommandes(page);
      if (res && res.results) {
        setCommandes((prev) => (append ? [...prev, ...res.results] : res.results));
        setCommandesNext(res.next);
      }
    } catch {
      if (!append) setCommandes([]);
    } finally {
      if (append) setCommandesNextLoading(false);
      else setCommandesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'commandes' && isUserVerified) {
      void loadCommandes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isUserVerified]);

  const loadMoreCommandes = () => {
    if (!commandesNext) return;
    const url = new URL(commandesNext);
    const page = Number.parseInt(url.searchParams.get('page') || '2', 10) || 2;
    void loadCommandes(page, true);
  };

  const userTickets = isUserVerified ? tickets : [];
  const filteredTickets = userTickets.filter((t) =>
    activeTab === 'valide' ? t.status === 'valide' : t.status !== 'valide'
  );

  const formatPrice = (price: number | string) => {
    const p = typeof price === 'string' ? Number.parseFloat(price) : price;
    if (p === 0) return 'Gratuit';
    return `${p.toLocaleString('fr-FR')} FBu`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] dark:bg-brand-dark transition-colors duration-200">
      
      {/* Top Header */}
      <div className="px-4 sm:px-6 pt-4 pb-2 sticky top-16 z-20 bg-white/70 dark:bg-brand-dark/70 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">
              Portefeuille de Billets
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isUserVerified ? 'Tous vos accès officiels et QR codes' : 'Accès réservé aux comptes acheteurs'}
            </p>
          </div>
          <span className="text-[10px] font-mono bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            SECURE ACCESS
          </span>
          {refreshing && isUserVerified && (
            <RefreshCcw className="w-3.5 h-3.5 text-orange-500 animate-spin" />
          )}
        </div>

        {/* Clickable tabs for filter (only if connected) */}
        {isUserVerified && (
          <div className="flex border-b border-slate-100 dark:border-slate-800 mt-4">
            <button
              id="tab-tickets-active"
              onClick={() => setActiveTab('valide')}
              className={`flex-1 text-center pb-2.5 text-xs font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
                activeTab === 'valide'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              À venir ({userTickets.filter((t) => t.status === 'valide').length})
            </button>
            
            <button
              id="tab-tickets-past"
              onClick={() => setActiveTab('historique')}
              className={`flex-1 text-center pb-2.5 text-xs font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
                activeTab === 'historique'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Historique ({userTickets.filter((t) => t.status !== 'valide').length})
            </button>

            <button
              id="tab-tickets-orders"
              onClick={() => setActiveTab('commandes')}
              className={`flex-1 text-center pb-2.5 text-xs font-semibold tracking-wide border-b-2 transition-all cursor-pointer ${
                activeTab === 'commandes'
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Mes commandes
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 flex-1 flex flex-col space-y-4 overflow-y-auto">
        
        {/* CASE 1: USER IS DISCONNECTED */}
        {/* CASE 0: TICKET ORDERS (getCommandes) */}
        {activeTab === 'commandes' ? (
          commandesLoading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center my-auto">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-500">Chargement de vos commandes...</p>
            </div>
          ) : !isUserVerified ? (
            <div className="py-16 text-center my-auto flex flex-col items-center justify-center max-w-sm mx-auto">
              <div className="p-5 rounded-3xl bg-slate-100 text-slate-400 mb-4 border border-slate-200">
                <Lock className="w-10 h-10" />
              </div>
              <h3 className="text-base font-display font-bold text-slate-800">Connexion requise</h3>
              <p className="text-xs text-slate-500 mt-1 text-center leading-relaxed">
                Connectez-vous pour consulter l'historique de vos commandes de billets.
              </p>
              <button
                onClick={() => openAuthModal('GENERAL')}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 cursor-pointer active:scale-95 transition-all"
              >
                Se connecter
              </button>
            </div>
          ) : commandes.length === 0 ? (
            <div className="py-16 text-center my-auto flex flex-col items-center justify-center max-w-sm mx-auto">
              <div className="p-5 rounded-3xl bg-slate-100 text-slate-400 mb-4 border border-slate-200">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <h3 className="text-base font-display font-bold text-slate-800">Aucune commande</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed text-center">
                Vous n'avez pas encore passé de commande. Achetez un billet pour la voir apparaître ici.
              </p>
              <button
                onClick={() => navigate('/home')}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 cursor-pointer active:scale-95 transition-all"
              >
                Découvrir les événements
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {commandes.map((cmd) => {
                const meta = COMMANDE_STATUT_META[cmd.statut] || COMMANDE_STATUT_META.PENDING;
                const StatutIcon = meta.Icon;
                return (
                  <div
                    key={cmd.id}
                    className="p-4 bg-white dark:bg-brand-card border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                          {cmd.event_titre}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID : {cmd.id.slice(0, 8)} • {cmd.tiers_lib} × {cmd.quantite}
                        </p>
                      </div>
                      <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0 inline-flex items-center gap-1 ${meta.className}`}>
                        <StatutIcon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5" />
                          {CANAL_LABEL[cmd.moyen_paiement] || cmd.moyen_paiement}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(cmd.date_creation)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatPrice(cmd.montant_fbu)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {commandesNext && (
                <button
                  onClick={loadMoreCommandes}
                  disabled={commandesNextLoading}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {commandesNextLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Chargement...</>
                  ) : (
                    <><ChevronRight className="w-4 h-4 rotate-90" /> Charger les commandes suivantes</>
                  )}
                </button>
              )}
            </div>
          )
        ) : !isUserVerified ? (
          <div className="py-12 sm:py-20 text-center my-auto flex flex-col items-center justify-center max-w-md mx-auto px-4">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-orange-500/20 via-amber-500/15 to-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-5 shadow-lg shadow-orange-500/10">
              <Ticket className="w-9 h-9 sm:w-10 sm:h-10 text-orange-500 rotate-12" />
            </div>
            
            <span className="text-[10px] font-mono font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest bg-orange-50 dark:bg-orange-950/40 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-500/30 mb-2">
              COMPTE REQUIS
            </span>

            <h3 className="text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white">
              Vous n'avez aucun billet pour le moment
            </h3>
            
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              C'est votre première visite sur IwacuTix ? Pour acheter un ticket et retrouver vos QR codes sécurisés, connectez-vous ou créez votre compte acheteur avec votre numéro de téléphone.
            </p>

            <div className="w-full max-w-xs mt-6 space-y-2.5">
              <button
                id="btn-buy-ticket-empty-state"
                onClick={() => openAuthModal('GENERAL')}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                <span>Acheter votre ticket</span>
              </button>

              <button
                onClick={() => navigate('/home')}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Explorer les événements d'abord</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          /* CASE 2: CONNECTED BUT NO TICKETS IN THIS TAB */
          <div className="py-16 text-center my-auto flex flex-col items-center justify-center max-w-sm mx-auto">
            <div className="p-5 rounded-3xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 mb-4 border border-slate-200 dark:border-slate-700">
              <Inbox className="w-10 h-10" />
            </div>
            <h3 className="text-base font-display font-bold text-slate-800 dark:text-slate-100">
              Aucun billet {activeTab === 'valide' ? 'à venir' : 'passé'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {activeTab === 'valide'
                ? "Vous n'avez aucune réservation à venir. Parcourez la programmation pour réserver vos places !"
                : "Votre historique d'événements passés est vide."}
            </p>
            {activeTab === 'valide' && (
              <button
                onClick={() => navigate('/home')}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 cursor-pointer active:scale-95 transition-all"
              >
                Trouver des événements
              </button>
            )}
          </div>
        ) : (
          /* CASE 3: TICKETS EXIST */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                id={`ticket-card-row-${t.id}`}
                onClick={() => navigate(`/billet/${t.id}`)}
                className="p-4 bg-white dark:bg-brand-card hover:bg-slate-50/80 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center gap-4 cursor-pointer group transition-all active:scale-99 shadow-sm hover:border-orange-300 dark:hover:border-orange-500/40"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500">
                      ID : {t.id}
                    </span>
                    <span className={`text-[8px] font-mono font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      t.status === 'valide' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-slate-700'
                    }`}>
                      {t.status === 'valide' ? 'Valide' : 'Utilisé'}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {t.eventTitle}
                  </h4>

                  {t.isGift && t.recipientName && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-100 dark:border-indigo-800/40">
                      <User className="w-3 h-3 text-indigo-500" />
                      <span>Bénéficiaire : {t.recipientName}</span>
                    </div>
                  )}

                  <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate">{t.eventDate} • {t.eventTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{t.eventLocation.split(',')[0]}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400 uppercase">Catégorie</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{t.categoryName} ({formatPrice(t.price)})</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all shadow-xs">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    Pass QR
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
