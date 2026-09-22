import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../AppContext';
import { 
  Home, Search, Ticket, User as UserIcon, Bell, 
  ShoppingBag, Sparkles, LogOut, Menu, X, PlusCircle,
  TrendingUp, Compass, Heart, Settings, ShieldCheck, HelpCircle,
  Clock, Megaphone, CheckCheck, Maximize, Minimize
} from 'lucide-react';
import { Logo } from './Logo';
import { IwacuTixLogo } from './IwacuTixLogo';

interface PhoneContainerProps {
  children: React.ReactNode;
}

export const PhoneContainer: React.FC<PhoneContainerProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const { user, tickets, cart, followedEventIds, events, notifications, markAllNotificationsAsRead } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const unreadNotifications = notifications ? notifications.filter(n => !n.read).length : 0;

  // Track fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch {
      // Ignore if iframe restrictions apply
    }
  };

  // Close mobile menu on path changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [path]);

  // Screens that do not need header or footer (standalone/onboarding/splash pages)
  const isStandaloneScreen = ['/', '/onboarding'].includes(path);

  const navItems = [
    { path: '/home', icon: Compass, label: 'Découvrir' },
    { path: '/recherche', icon: Search, label: 'Rechercher' },
    { path: '/mes-billets', icon: Ticket, label: 'Mes Billets' },
    { path: '/profil', icon: UserIcon, label: 'Mon Profil' },
  ];

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const activeTicketsCount = tickets.filter(t => t.status === 'valide').length;

  if (isStandaloneScreen) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col w-full antialiased text-slate-800">
        <div className="flex-1 w-full flex flex-col">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col w-full antialiased text-slate-800 font-sans">
      
      {/* ================= MODERN RESPONSIVE HEADER / NAVBAR ================= */}
      <header className="sticky top-0 z-50 w-full bg-white/75 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 backdrop-blur-xl border-b border-orange-300/40 shadow-sm shadow-orange-500/5 shrink-0">
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Left: Branding & Logo */}
          <Link to="/home" className="flex items-center gap-3 active:scale-95 transition-all">
            <IwacuTixLogo size="md" showTagline={true} />
          </Link>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-3">
            {navItems.map((item) => {
              const isActive = path === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                    isActive 
                      ? 'bg-orange-500/20 text-orange-900 border border-orange-300/50 shadow-xs' 
                      : 'text-slate-700 hover:text-orange-950 hover:bg-orange-500/10'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* Direct access to create event */}
            <Link
              to="/organisateur/creer"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                path === '/organisateur/creer'
                  ? 'bg-emerald-500/20 text-emerald-900 border border-emerald-300/50'
                  : 'text-slate-700 hover:text-emerald-900 hover:bg-emerald-500/10'
              }`}
            >
              <PlusCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="text-emerald-800">Créer un événement</span>
            </Link>
          </nav>

          {/* Right: Actions (Fullscreen, Notifications, Cart, Profile) */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Fullscreen Toggle (Cinema Mode) */}
            <button
              onClick={toggleFullscreen}
              className="relative p-2.5 rounded-xl border bg-white/60 hover:bg-white/90 border-orange-200/70 text-slate-700 hover:text-orange-950 transition-all cursor-pointer active:scale-95 shadow-xs"
              title={isFullscreen ? "Quitter le plein écran" : "Mode plein écran Cinéma"}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5 text-amber-600" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>

            {/* Notifications Alert Bell */}
            <button
              onClick={() => {
                setShowNotifications(true);
                markAllNotificationsAsRead();
              }}
              className="relative p-2.5 rounded-xl border bg-white/60 hover:bg-white/90 border-orange-200/70 text-slate-700 hover:text-orange-950 transition-all cursor-pointer active:scale-95 shadow-xs"
              title="Centre de notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[9px] font-mono font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {/* Shopping Cart Badge */}
            <Link
              to="/panier"
              className={`relative p-2.5 rounded-xl border transition-all ${
                path === '/panier'
                  ? 'bg-orange-500/20 border-orange-300 text-orange-900 shadow-xs'
                  : 'bg-white/60 hover:bg-white/90 border-orange-200/70 text-slate-700 hover:text-orange-950 shadow-xs'
              }`}
              title="Mon panier de billets"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-primary text-white text-[9px] font-mono font-black rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                  {totalCartItems}
                </span>
              )}
            </Link>

            {/* User Profile Avatar with small greeting on Desktop */}
            <Link
              to="/profil"
              className="flex items-center gap-2.5 p-1 sm:p-1.5 pr-2.5 sm:pr-3 bg-white/60 hover:bg-white/90 border border-orange-200/70 rounded-xl transition-all group shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-orange-200 shrink-0 shadow-xs">
                <img referrerPolicy="no-referrer" src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[9px] font-mono font-semibold text-slate-400 uppercase leading-none">Acheteur</p>
                <p className="text-[11px] font-bold text-slate-700 group-hover:text-brand-primary transition-colors mt-0.5">{user.name.split(' ')[0]}</p>
              </div>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl bg-white/60 border border-orange-200/70 text-slate-700 hover:text-orange-950 cursor-pointer active:scale-95 transition-transform shadow-xs"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>

        {/* Mobile Menu Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-orange-200/40 bg-white/90 backdrop-blur-xl p-4 space-y-2.5 shadow-lg">
            <p className="text-[10px] font-mono font-black text-orange-900/60 uppercase tracking-wider pl-2 mb-1">
              Navigation principale
            </p>
            {navItems.map((item) => {
              const isActive = path === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 p-3 rounded-xl font-bold text-xs transition-all ${
                    isActive 
                      ? 'bg-orange-500/20 text-orange-900 border border-orange-300/40' 
                      : 'text-slate-700 hover:bg-orange-500/10'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 text-slate-500" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            <div className="pt-2 border-t border-orange-100">
              <Link
                to="/organisateur/creer"
                className={`flex items-center gap-3 p-3 rounded-xl font-bold text-xs transition-all ${
                  path === '/organisateur/creer'
                    ? 'bg-emerald-500/20 text-emerald-900 border border-emerald-300/40'
                    : 'text-slate-700 hover:bg-emerald-500/10'
                }`}
              >
                <PlusCircle className="w-4.5 h-4.5 text-emerald-600" />
                <span className="text-emerald-800">Créer un événement</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ================= MAIN RESPONSIVE BODY CONTAINER ================= */}
      <main className="flex-1 w-full flex flex-col">
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 flex flex-col flex-1">
          {children}
        </div>
      </main>

      {/* ================= MODERN WEB FOOTER ================= */}
      <footer className="w-full bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 md:px-8 lg:px-12 shrink-0 mt-auto border-t border-slate-800">
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-left">
            
            {/* Col 1: Brand Pitch */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-white">
                <IwacuTixLogo size="md" theme="dark" showTagline={false} />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-normal">
                <strong className="text-white font-bold">IwacuTix</strong> — Tes tickets, tes événements. La billetterie digitale et mobile de nouvelle génération au Burundi. Achetez vos tickets instantanément via Lumicash, EcoCash ou Bancobu et vibrez au rythme des meilleurs concerts, festivals, matchs et spectacles.
              </p>
            </div>

            {/* Col 2: Info & Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Découvrir</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/home" className="hover:text-white transition-colors">Tous les Événements</Link>
                </li>
                <li>
                  <Link to="/recherche" className="hover:text-white transition-colors">Rechercher</Link>
                </li>
                <li>
                  <Link to="/mes-billets" className="hover:text-white transition-colors">Mes Billets d'accès</Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Partners & Security */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Organisateurs</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Vous organisez un concert, un match de sport ou une conférence ? Créez vos tarifs et vendez vos billets en ligne avec un tableau de bord de suivi en temps réel.
              </p>
              <Link 
                to="/organisateur/creer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-500 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Publier un Événement</span>
              </Link>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-500">
            <span className="font-mono">© 2026 IwacuTix. Tous droits réservés.</span>
            <div className="flex items-center gap-4">
              <span>Bujumbura, Burundi</span>
              <span>•</span>
              <span className="text-slate-400 flex items-center gap-1 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Paiements Sécurisés
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* ================= MOBILE EXCLUSIVE ACTION BAR (Optional but extremely high usability) ================= */}
      <div className="md:hidden sticky bottom-0 z-50 w-full bg-white/80 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 backdrop-blur-xl border-t border-orange-300/40 px-4 py-2.5 flex items-center justify-around shrink-0 shadow-[0_-4px_16px_-2px_rgba(249,115,22,0.1)]">
        {navItems.map((item) => {
          const isActive = path === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl transition-all ${
                isActive ? 'text-orange-600 font-bold' : 'text-slate-600 hover:text-orange-950'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className="text-[9px] font-medium tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ================= GLOBAL NOTIFICATIONS DRAWER ================= */}
      {showNotifications && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end transition-all duration-300">
          <div className="absolute inset-0" onClick={() => setShowNotifications(false)} />
          
          <div className="relative bg-white rounded-t-[32px] max-w-lg w-full mx-auto max-h-[85vh] flex flex-col overflow-hidden shadow-2xl z-10 border-t border-slate-200 animate-slide-up">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-600" />
                <h3 className="text-sm font-display font-extrabold text-slate-900 tracking-tight">Notifications IwacuTix</h3>
              </div>
              <button 
                onClick={() => setShowNotifications(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50/70">
              {!notifications || notifications.length === 0 ? (
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

            <div className="px-5 py-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                {notifications?.length || 0} Notifications
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
