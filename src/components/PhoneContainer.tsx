import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../AppContext';
import { 
  Home, Search, Ticket, User as UserIcon, Bell, 
  Sparkles, LogOut, Menu, X, PlusCircle,
  TrendingUp, Compass, Heart, Settings, ShieldCheck, HelpCircle,
  Clock, Megaphone, CheckCheck, Download,
  ChevronDown, ArrowRight
} from 'lucide-react';
import { Logo } from './Logo';
import { IwacuTixLogo } from './IwacuTixLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';

interface PhoneContainerProps {
  children: React.ReactNode;
}

export const PhoneContainer: React.FC<PhoneContainerProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const { 
    user, 
    tickets, 
    cart, 
    followedEventIds, 
    events, 
    notifications, 
    markAllNotificationsAsRead,
    currentPersona,
    switchPersona,
    isUserVerified,
    openAuthModal
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const isOrganizer = currentPersona === 'ORGANISATEUR' || currentPersona === 'SUPERADMIN' || user.role === 'ORGANISATEUR' || user.role === 'SUPERADMIN' || (user.role as string)?.toLowerCase() === 'organisateur';
  const unreadNotifications = notifications ? notifications.filter(n => !n.read).length : 0;

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on path changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [path]);

  // Screens that do not need header or footer (standalone/onboarding/splash pages)
  const isStandaloneScreen = ['/', '/onboarding'].includes(path);

  const baseNavItems = [
    { path: '/home', icon: Compass, label: 'Découvrir' },
    { path: '/recherche', icon: Search, label: 'Rechercher' },
    { path: '/mes-billets', icon: Ticket, label: 'Mes Billets' },
  ];

  // Organizer space is only displayed in navigation for organizers
  const navItems = isOrganizer
    ? [...baseNavItems, { path: '/organisateur', icon: TrendingUp, label: 'Espace Organisateur' }]
    : baseNavItems;

  if (isStandaloneScreen) {
    // The "/" landing is the public events page: always browsable without an account
    const isPublicLanding = path === '/';
    return (
      <div className={`min-h-screen bg-[#F8FAFC] flex flex-col w-full antialiased text-slate-800 ${isPublicLanding ? '' : 'pt-[env(safe-area-inset-top)]'}`}>

        {/* Public landing header with account actions (hidden for guest-only navigation, login/register CTA) */}
        {isPublicLanding && (
          <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-orange-200/50 shadow-xs shrink-0 pt-[env(safe-area-inset-top)]">
            <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 h-16 flex items-center justify-between gap-2">
              <Link to="/home" className="flex items-center gap-2 active:scale-95 transition-all min-w-0">
                <IwacuTixLogo size="sm" showTagline={true} />
              </Link>

              {isUserVerified ? (
                <button
                  onClick={() => navigate('/home')}
                  className="flex items-center gap-2 p-1.5 pl-2 pr-3 rounded-full bg-white hover:bg-slate-50 border border-orange-200/70 hover:border-orange-300 transition-all shadow-xs cursor-pointer active:scale-95 group min-w-0"
                  title="Mon espace"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-orange-200 shrink-0">
                    <img referrerPolicy="no-referrer" src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="hidden sm:block text-[11px] font-bold text-slate-800 truncate max-w-[120px]" title={user.name}>
                    {user.name}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openAuthModal('GENERAL')}
                    className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-xl border border-orange-300/70 text-orange-800 hover:bg-orange-50 font-bold text-xs transition-all cursor-pointer active:scale-95"
                  >
                    Se connecter
                  </button>
                  <button
                    onClick={() => openAuthModal('GENERAL')}
                    className="inline-flex items-center px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                  >
                    Créer un compte
                  </button>
                </div>
              )}
            </div>
          </header>
        )}

        <div className="flex-1 w-full flex flex-col">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col w-full antialiased text-slate-800 font-sans relative">
      <OfflineIndicator />
      
      {/* ================= MODERN RESPONSIVE HEADER / NAVBAR ================= */}
      <header className="sticky top-0 z-50 w-full bg-white/80 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-orange-500/10 backdrop-blur-xl border-b border-orange-200/50 shadow-xs shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 h-16 sm:h-18 flex items-center justify-between">
          
          {/* Left: Branding & Logo */}
          <Link to="/home" className="flex items-center gap-3 active:scale-95 transition-all">
            <IwacuTixLogo size="md" showTagline={true} />
          </Link>

          {/* Center: Clean Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {navItems.map((item) => {
              const isActive = path === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                    isActive 
                      ? 'bg-orange-500/15 text-orange-950 border border-orange-300/60 shadow-xs' 
                      : 'text-slate-700 hover:text-orange-950 hover:bg-orange-500/10'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Unified, Clean User Profile Menu & Mobile Toggle */}
          <div className="flex items-center gap-2.5">
            
            {/* Unified User Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-2 pr-3 rounded-full bg-white/80 hover:bg-white border border-orange-200/70 hover:border-orange-300 transition-all shadow-xs cursor-pointer active:scale-95 group"
                title="Menu utilisateur"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-orange-200 shrink-0 shadow-xs">
                    <img referrerPolicy="no-referrer" src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </div>

                <div className="hidden sm:block text-left pr-0.5 max-w-[140px]">
                  <p className="text-[11px] font-bold text-slate-800 leading-tight group-hover:text-brand-primary transition-colors truncate" title={user.name}>
                    {user.name}
                  </p>
                  <p className="text-[9px] font-mono font-semibold text-orange-600 uppercase leading-none">
                    {isOrganizer ? 'Organisateur' : 'Acheteur'}
                  </p>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform ${profileMenuOpen ? 'rotate-180 text-orange-600' : ''}`} />
              </button>

              {/* Profile Dropdown Menu Card */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white/95 backdrop-blur-xl rounded-2xl border border-orange-200/80 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Dropdown Header: Identity & Role Switch */}
                  <div className="p-3.5 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border-b border-orange-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-orange-200 shrink-0 shadow-xs">
                      <img referrerPolicy="no-referrer" src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{user.email || user.phone}</p>
                      <span className={`inline-block mt-0.5 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                        isOrganizer 
                          ? 'bg-indigo-100 text-indigo-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {isOrganizer ? 'Compte Organisateur' : 'Compte Acheteur'}
                      </span>
                    </div>
                  </div>

                  {/* Dropdown Actions */}
                  <div className="p-2 space-y-0.5 text-xs">
                    
                    {/* Mon Profil */}
                    <Link
                      to="/profil"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-orange-50/80 text-slate-700 hover:text-orange-950 font-medium transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-orange-600" />
                      <span>Mon Profil & Photo</span>
                    </Link>

                    {/* Notifications */}
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setShowNotifications(true);
                        markAllNotificationsAsRead();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-orange-50/80 text-slate-700 hover:text-orange-950 font-medium transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-orange-600" />
                        <span>Notifications</span>
                      </div>
                      {unreadNotifications > 0 && (
                        <span className="bg-rose-600 text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded-full">
                          {unreadNotifications} new
                        </span>
                      )}
                    </button>

                    {/* Organizer Section: Only for Organizers */}
                    {isOrganizer ? (
                      <div className="pt-1.5 pb-1 border-t border-slate-100 my-1">
                        <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-indigo-900/60 px-2.5 py-1">
                          Gestion Organisateur
                        </p>
                        <Link
                          to="/organisateur"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-indigo-50/80 text-indigo-900 font-bold transition-colors"
                        >
                          <TrendingUp className="w-4 h-4 text-indigo-600" />
                          <span>Tableau de Bord</span>
                        </Link>
                        <Link
                          to="/organisateur/creer"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-emerald-50/80 text-emerald-900 font-bold transition-colors"
                        >
                          <PlusCircle className="w-4 h-4 text-emerald-600" />
                          <span>Créer un événement</span>
                        </Link>
                      </div>
                    ) : (
                      <div className="pt-1.5 pb-1 border-t border-slate-100 my-1">
                        <button
                          onClick={() => {
                            switchPersona('ORGANISATEUR');
                            setProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-orange-50/80 hover:bg-orange-100 text-orange-900 font-bold transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-brand-primary" />
                            <span>Passer au mode Organisateur</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-brand-primary" />
                        </button>
                      </div>
                    )}

                    <div className="pt-1 border-t border-slate-100 my-1">
                      <Link
                        to="/profil"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-slate-500" />
                        <span>Mon Profil & Paramètres</span>
                      </Link>
<Link
                        to="/"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-medium transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Déconnexion</span>
                      </Link>
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-white/80 border border-orange-200/70 text-slate-700 hover:text-orange-950 cursor-pointer active:scale-95 transition-transform shadow-xs"
              title="Menu principal"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>

        {/* Mobile Menu Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-orange-200/40 bg-white/95 backdrop-blur-xl p-4 space-y-2 shadow-lg">
            <p className="text-[10px] font-mono font-black text-orange-900/60 uppercase tracking-wider pl-2 mb-1">
              Navigation
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
            
            {/* Event creation in mobile menu only for organizers */}
            {isOrganizer && (
              <div className="pt-2 border-t border-orange-100">
                <Link
                  to="/organisateur/creer"
                  className={`flex items-center gap-3 p-3 rounded-xl font-bold text-xs transition-all ${
                    path === '/organisateur/creer'
                      ? 'bg-emerald-500/20 text-emerald-900 border border-emerald-300/40'
                      : 'text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100'
                  }`}
                >
                  <PlusCircle className="w-4.5 h-4.5 text-emerald-600" />
                  <span>Créer un événement</span>
                </Link>
              </div>
            )}
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
              {isOrganizer ? (
                <Link 
                  to="/organisateur/creer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-500 transition-all cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Publier un Événement</span>
                </Link>
              ) : (
                <button
                  onClick={() => switchPersona('ORGANISATEUR')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-orange-300 hover:text-white border border-slate-700 font-bold text-[11px] transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Devenir Organisateur</span>
                </button>
              )}
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
      <div className="md:hidden sticky bottom-0 z-50 w-full bg-white/80 bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 backdrop-blur-xl border-t border-orange-300/40 px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex items-center justify-around shrink-0 shadow-[0_-4px_16px_-2px_rgba(249,115,22,0.1)]">
        {navItems.map((item) => {
          const isActive = path === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition-all min-w-0 flex-1 ${
                isActive ? 'text-orange-600 font-bold' : 'text-slate-600 hover:text-orange-950'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className="text-[9px] font-medium tracking-tight truncate w-full text-center">{item.label}</span>
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

            <div className="px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
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

      {/* ================= FLOATING PWA INSTALL BUTTON (BOTTOM-LEFT ON ALL PAGES) ================= */}
      <PWAInstallButton variant="floating" />

    </div>
  );
};
