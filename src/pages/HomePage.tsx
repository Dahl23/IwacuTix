import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { NetflixHeroSlider } from '../components/NetflixHeroSlider';
import { NetflixEventRow } from '../components/NetflixEventRow';
import { 
  Search, Calendar, MapPin, Ticket, Bell, Sparkles, 
  Trophy, Music, HelpCircle, Briefcase, X, Megaphone, 
  Clock, CheckCheck, Flame, Compass, Filter, PlusCircle, ShieldCheck, ArrowRight, QrCode
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user, 
    events, 
    selectedCategory, 
    setSelectedCategory, 
    notifications,
    markAllNotificationsAsRead
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const categories = [
    { id: 'Tous', name: 'Tous', icon: Sparkles },
    { id: 'sport', name: 'Sport', icon: Trophy },
    { id: 'musique', name: 'Musique', icon: Music },
    { id: 'religion', name: 'Religion', icon: HelpCircle },
    { id: 'corporate', name: 'Corporate', icon: Briefcase },
  ];

  // Specific event slices for Netflix-style themed shelves
  const trendingEvents = [...events].sort((a, b) => {
    // Sort featured first, then by popularity or id
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });
  const sportsEvents = events.filter((e) => e.category === 'sport');
  const musicEvents = events.filter((e) => e.category === 'musique');
  const corporateEvents = events.filter((e) => e.category === 'corporate');
  const religionEvents = events.filter((e) => e.category === 'religion');

  // Filter events based on active category
  const filteredEvents = events.filter((evt) => {
    if (selectedCategory === 'Tous') return true;
    return evt.category === selectedCategory;
  });

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  const getMinPrice = (evt: typeof events[0]) => {
    if (!evt.ticketCategories || evt.ticketCategories.length === 0) return 0;
    return Math.min(...evt.ticketCategories.map((tc) => tc.price));
  };

  return (
    <div className="flex-1 flex flex-col space-y-6 sm:space-y-8 lg:space-y-10 animate-fade-in relative pb-10 lg:pb-16">
      
      {/* ================= 1. NETFLIX-STYLE CINEMATIC HERO SLIDER ================= */}
      {/* Sits right below the navigation bar with auto-advancing slides & CTA */}
      <section className="w-full">
        <NetflixHeroSlider events={events} autoPlayInterval={5500} />
      </section>

      {/* ================= 2. QUICK SEARCH & CATEGORY SELECTOR ================= */}
      <section className="space-y-3 sm:space-y-4">
        
        {/* Search Bar Trigger */}
        <div 
          onClick={() => navigate('/recherche')}
          className="relative flex items-center w-full px-4 py-3.5 rounded-2xl bg-white border border-slate-200/80 text-slate-500 hover:text-slate-800 transition-all cursor-pointer shadow-sm hover:border-amber-400/60 group"
        >
          <Search className="w-5 h-5 mr-3 text-slate-400 group-hover:text-amber-500 transition-colors" />
          <span className="text-sm font-medium">Rechercher un concert, match, lieu (ex: Stade Rwagasore, Kiriri)...</span>
          <span className="ml-auto hidden sm:inline-flex text-[11px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
            Recherche rapide ↵
          </span>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-2 -mx-4 sm:-mx-6 md:-mx-8 lg:-mx-12 px-4 sm:px-6 md:px-8 lg:px-12 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`category-tab-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15 scale-102 ring-2 ring-amber-400/40'
                    : 'bg-white text-slate-600 border border-slate-200/80 shadow-sm hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= ORGANIZER PROMOTION & VERIFICATION BANNER ================= */}
      <section className="bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 rounded-3xl p-5 sm:p-6 md:p-8 text-white border border-orange-500/30 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                Espace Billetterie & Partenaires
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Bujumbura • Gitega • Ngozi</span>
            </div>
            <h3 className="text-base sm:text-lg font-display font-extrabold text-white">
              Vous organisez un concert, match ou événement ?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Vérifiez votre identité (CNI Recto/Verso + Email) pour publier vos billets, accéder au tableau de bord des statistiques en direct et nommer vos scanneurs de billets à l'entrée.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2.5">
            {user.role === 'ORGANISATEUR' || user.role === 'SUPERADMIN' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/organisateur')}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/20 transition-all cursor-pointer"
                >
                  Statistiques
                </button>
                <button
                  onClick={() => navigate('/organisateur/creer')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/25 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Créer un événement</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/organisateur/verification')}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/25 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Créer un événement (Vérifier CNI)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ================= 3. NETFLIX-STYLE THEMED SHELVES ("TOUS" VIEW) ================= */}
      {selectedCategory === 'Tous' ? (
        <div className="space-y-8 sm:space-y-10 lg:space-y-12">
          
          {/* Row 1: Top 5 Trending at Burundi */}
          <NetflixEventRow
            title="Tendances au Burundi"
            subtitle="Les événements les plus réservés et recherchés cette semaine"
            badge="TOP 5"
            icon={Flame}
            events={trendingEvents}
            showRankNumber={true}
          />

          {/* Row 2: Primus Ligue & Sports */}
          {sportsEvents.length > 0 && (
            <NetflixEventRow
              title="Primus Ligue & Grands Matchs"
              subtitle="Stade Prince Louis Rwagasore, tournois de la solidarité et derbys"
              badge="SPORT"
              icon={Trophy}
              events={sportsEvents}
            />
          )}

          {/* Row 3: Concerts & Festivals */}
          {musicEvents.length > 0 && (
            <NetflixEventRow
              title="Concerts, Festivals & Nuits Festives"
              subtitle="Musique live au bord du Lac Tanganyika et artistes burundais"
              badge="LIVE SHOWS"
              icon={Music}
              events={musicEvents}
            />
          )}

          {/* Row 4: Tech, Conférences & Business */}
          {corporateEvents.length > 0 && (
            <NetflixEventRow
              title="Conférences, Sommets & Business"
              subtitle="Ateliers tech, investissements et opportunités professionnelles"
              badge="PRO"
              icon={Briefcase}
              events={corporateEvents}
            />
          )}

          {/* Row 5: Événements Spirituels & Religieux */}
          {religionEvents.length > 0 && (
            <NetflixEventRow
              title="Grands Rassemblements & Croisades"
              subtitle="Moments de louange, prière et chorales au Palais des Congrès"
              badge="FOI"
              icon={HelpCircle}
              events={religionEvents}
            />
          )}

          {/* All events summary grid */}
          <section className="space-y-4 pt-5 sm:pt-6 border-t border-slate-200/60">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-display font-black text-lg text-slate-900 tracking-tight flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-600" />
                  <span>Tous les événements à venir</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Parcourez l'intégralité du calendrier culturel et sportif de Bujumbura
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                {events.length} événements
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  id={`all-event-card-${evt.id}`}
                  onClick={() => navigate(`/evenement/${evt.id}`)}
                  className="w-full sm:w-[calc(50%-0.75rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1.125rem)] xl:w-[calc(20%-1.2rem)] bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                    <img
                      src={evt.imageUrl}
                      alt={evt.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md border border-white/15">
                      {evt.category}
                    </span>
                    <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-amber-500 text-slate-950 shadow-md">
                      Dès {formatPrice(getMinPrice(evt))}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <h4 className="font-display font-bold text-base text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {evt.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                        {evt.description}
                      </p>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{evt.date} • {evt.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{evt.location}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase truncate max-w-[140px]">
                        {evt.organisateur}
                      </span>
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white text-xs font-bold transition-colors">
                        <span>Réserver</span>
                        <Ticket className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      ) : (
        /* ================= 4. FILTERED CATEGORY VIEW ================= */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-display font-black text-lg text-slate-900 tracking-tight flex items-center gap-2">
                <Filter className="w-5 h-5 text-indigo-600" />
                <span>Événements : {categories.find((c) => c.id === selectedCategory)?.name}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''} disponible{filteredEvents.length > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setSelectedCategory('Tous')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Afficher tout
            </button>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-3">
              <Ticket className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-slate-700 font-bold text-base">Aucun événement trouvé</h4>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Il n'y a actuellement aucun événement répertorié dans cette catégorie.
              </p>
              <button
                onClick={() => setSelectedCategory('Tous')}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                Retourner aux événements
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  id={`filtered-event-card-${evt.id}`}
                  onClick={() => navigate(`/evenement/${evt.id}`)}
                  className="w-full sm:w-[calc(50%-0.75rem)] md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-1.125rem)] xl:w-[calc(20%-1.2rem)] bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                    <img
                      src={evt.imageUrl}
                      alt={evt.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md border border-white/15">
                      {evt.category}
                    </span>
                    <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-amber-500 text-slate-950 shadow-md">
                      Dès {formatPrice(getMinPrice(evt))}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <h4 className="font-display font-bold text-base text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {evt.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                        {evt.description}
                      </p>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{evt.date} • {evt.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{evt.location}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase truncate max-w-[140px]">
                        {evt.organisateur}
                      </span>
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white text-xs font-bold transition-colors">
                        <span>Réserver</span>
                        <Ticket className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= NOTIFICATION MODAL OVERLAY ================= */}
      {showNotifications && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setShowNotifications(false)} />
          
          <div className="relative bg-white rounded-t-[32px] max-w-lg w-full mx-auto max-h-[85vh] flex flex-col overflow-hidden shadow-2xl z-10 border-t border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-display font-black text-slate-900 tracking-tight">Notifications IwacuTix</h3>
              </div>
              <button 
                onClick={() => setShowNotifications(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50/70">
              {notifications.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">Aucune notification</h4>
                  <p className="text-[11px] text-slate-400">Vous recevrez des alertes quand vos événements approchent.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (notif.eventId) {
                        setShowNotifications(false);
                        navigate(`/evenement/${notif.eventId}`);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border transition-all text-left flex gap-3 ${
                      notif.eventId ? 'cursor-pointer hover:bg-slate-50 hover:border-slate-300' : ''
                    } ${
                      !notif.read 
                        ? 'bg-white border-indigo-200 shadow-sm' 
                        : 'bg-white/60 border-slate-100'
                    }`}
                  >
                    <div className="shrink-0">
                      {notif.type === 'approaching' && (
                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}
                      {notif.type === 'update' && (
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 animate-pulse">
                          <Megaphone className="w-4 h-4" />
                        </div>
                      )}
                      {notif.type === 'system' && (
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <Ticket className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                          notif.type === 'approaching' ? 'text-amber-600' :
                          notif.type === 'update' ? 'text-indigo-600' : 'text-emerald-600'
                        }`}>
                          {notif.type === 'approaching' ? 'Rappel' :
                           notif.type === 'update' ? 'Mise à Jour' : 'Système'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono shrink-0">{notif.date}</span>
                      </div>
                      <h4 className={`text-xs font-bold leading-tight ${!notif.read ? 'text-slate-900 font-extrabold' : 'text-slate-600 font-semibold'}`}>
                        {notif.title}
                      </h4>
                      <p className="text-[10.5px] text-slate-500 leading-normal font-sans">
                        {notif.body}
                      </p>
                      
                      {notif.eventId && (
                        <div className="pt-1 flex items-center gap-1 text-[9.5px] text-indigo-600 font-bold">
                          <span>Voir l'événement</span>
                          <span className="text-xs">→</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                {notifications.length} {notifications.length > 1 ? 'Notifications' : 'Notification'}
              </span>
              <button
                onClick={() => {
                  markAllNotificationsAsRead();
                  setShowNotifications(false);
                }}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tout marquer comme lu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
