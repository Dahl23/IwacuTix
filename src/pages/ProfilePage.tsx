import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { 
  User, 
  Smartphone, 
  Mail, 
  CreditCard, 
  Ticket, 
  ShieldCheck, 
  LogOut, 
  Settings, 
  HelpCircle, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  TrendingUp, 
  Sparkles, 
  Star,
  QrCode,
  Building2,
  Lock,
  Wallet,
  KeyRound,
  Server
} from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { getStoredAccessToken, API_BASE_URL } from '../services/apiClient';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user, 
    tickets, 
    events, 
    followedEventIds, 
    currentPersona, 
    scanneurAssignments,
    portefeuille 
  } = useApp();
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const activeTicketsCount = tickets.filter((t) => t.status === 'valide').length;
  const hasJwt = !!getStoredAccessToken();

  // Active assignments for this user
  const userAssignments = scanneurAssignments.filter(
    (a) => a.actif && (a.user_id === user.id || a.user_telephone === user.phone)
  );

  const profileOptions = [
    {
      label: 'Mon portefeuille de billets',
      description: `${activeTicketsCount} ticket(s) actif(s)`,
      icon: Ticket,
      action: () => navigate('/mes-billets')
    },
    {
      label: 'Moyens de paiement enregistrés',
      description: 'Lumicash & Ecocash + Bitcoin Lightning (Blink)',
      icon: CreditCard,
      action: () => alert(`Votre compte Mobile Money (${user.phone}) et portefeuille Lightning sont configurés.`)
    },
    {
      label: 'Sécurité & Authentification OTP',
      description: 'Authentification par SMS OTP actif (Section 3)',
      icon: ShieldCheck,
      action: () => alert('Compte lié au numéro de téléphone vérifié par code OTP unique.')
    },
    {
      label: 'Support technique IwacuTix',
      description: 'FAQ & Assistance Bujumbura',
      icon: HelpCircle,
      action: () => alert('Contactez le support IwacuTix sur Telegram ou WhatsApp au +257 69 000 000.')
    }
  ];

  const handleLogout = () => {
    if (confirm('Voulez-vous vraiment vous déconnecter de IwacuTix ?')) {
      alert('Déconnexion réussie. Redirection vers l\'accueil.');
      navigate('/');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      
      {/* Top Header */}
      <div className="px-5 pt-4 pb-2 sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-slate-200/80 shadow-sm flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-slate-900 tracking-tight">Mon Profil</h2>
        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
          user.role === 'SUPERADMIN' 
            ? 'bg-purple-100 text-purple-800 border border-purple-200' 
            : user.role === 'ORGANISATEUR'
            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
            : currentPersona === 'SCANNEUR'
            ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
        }`}>
          {currentPersona === 'SCANNEUR' ? 'OPÉRATEUR SCAN' : user.role}
        </span>
      </div>

      {/* Profile Info Card Header */}
      <div className="p-5 flex flex-col items-center text-center space-y-4">
        {/* Rounded Avatar */}
        <div className="w-20 h-20 rounded-full p-1 border-2 border-brand-primary bg-white shadow-xl overflow-hidden relative group">
          <img 
            referrerPolicy="no-referrer"
            src={user.avatarUrl} 
            alt={user.name} 
            className="w-full h-full object-cover rounded-full" 
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-display font-bold text-slate-900 tracking-tight">{user.name}</h3>
          
          {user.role === 'ORGANISATEUR' && (
            <p className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-indigo-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              KYC VÉRIFIÉ • {user.organisateurProfile?.nom_structure || "Vital'O FC"}
            </p>
          )}

          {user.role === 'SUPERADMIN' && (
            <p className="text-[10px] font-mono font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-purple-200">
              <Lock className="w-3 h-3 text-purple-600" />
              ADMINISTRATION PLATEFORME HQ
            </p>
          )}

          {user.role === 'ACHETEUR' && currentPersona !== 'SCANNEUR' && (
            <p className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full inline-block border border-emerald-200">
              ACHETEUR AUTHENTIFIÉ (OTP)
            </p>
          )}

          {currentPersona === 'SCANNEUR' && (
            <p className="text-[10px] font-mono font-bold text-cyan-800 uppercase tracking-wider bg-cyan-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-cyan-200">
              <QrCode className="w-3 h-3 text-cyan-600" />
              CONTRÔLE D'ACCÈS • {userAssignments.length} ASSIGNATION(S)
            </p>
          )}
        </div>

        {/* Localized data cards */}
        <div className="w-full grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5 text-left shadow-sm">
            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Numéro Principal</span>
            <span className="text-xs font-bold font-mono text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-brand-primary" />
              {user.phone.replace('+257 ', '')}
            </span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5 text-left shadow-sm">
            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Email</span>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="truncate">{user.email.split('@')[0]}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 space-y-4">
        {/* Backend API Connection & JWT Authentication Box */}
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-brand-primary" />
              API IwacuTix Backend
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {API_BASE_URL}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="space-y-0.5 text-left">
              <p className="font-bold text-slate-800">
                {hasJwt ? 'Session JWT Active' : 'Mode Démonstration'}
              </p>
              <p className="text-[9px] text-slate-400 font-mono">
                {hasJwt ? 'Jeton Access (60m) & Refresh (7j) chargés' : 'Connectez-vous par SMS OTP ou login Pro'}
              </p>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="py-1.5 px-3 bg-brand-primary hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <KeyRound className="w-3 h-3" />
              {hasJwt ? 'Changer' : 'Connexion'}
            </button>
          </div>
        </div>

        {/* PWA Mobile App Installation Card */}
        <PWAInstallButton variant="profile" />

        {/* ROLE-SPECIFIC ACTION PANELS */}

        {/* 1. SuperAdmin Console Access */}
        {(user.role === 'SUPERADMIN' || currentPersona === 'SUPERADMIN') && (
          <div className="p-3.5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-purple-300" />
                Console SuperAdmin IwacuTix
              </span>
              <span className="text-[9px] font-mono text-purple-200 bg-purple-800/80 px-2 py-0.5 rounded-full">
                Accès Restreint
              </span>
            </div>
            <p className="text-[10px] text-purple-200 leading-snug">
              Validez les dossiers KYC des organisateurs et configurez les paramètres de reversement de la plateforme.
            </p>
            <button
              onClick={() => navigate('/admin/superadmin')}
              className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
            >
              Ouvrir le panneau SuperAdmin <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 2. Scanner Interface Access */}
        <div className="p-3.5 bg-gradient-to-r from-cyan-900 to-slate-900 text-white rounded-2xl space-y-2 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-cyan-400" />
              Poste de Contrôle & Scan de Billets
            </span>
            <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-700">
              Section 4 & 8
            </span>
          </div>
          <p className="text-[10px] text-slate-300 leading-snug">
            Interface dédiée aux scanneurs habilités pour le contrôle instantané des QR codes avec détection anti-fraude.
          </p>
          <button
            onClick={() => navigate('/scan')}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
          >
            Lancer le Scanner de Billets <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3. Espace Organisateur Section */}
        <div className="space-y-2 pt-1">
          <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider pl-1 font-semibold">
            ESPACE ORGANISATEUR (PARTENAIRE)
          </h4>
          
          {/* Button to Create Event */}
          <div
            id="btn-create-event-nav"
            onClick={() => navigate('/organisateur/creer')}
            className="p-3.5 bg-gradient-to-r from-indigo-500/10 to-indigo-600/5 hover:from-indigo-500/15 hover:to-indigo-600/10 border border-indigo-200 rounded-xl flex items-center justify-between cursor-pointer group transition-all shadow-sm"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-2.5 rounded-lg bg-indigo-600 text-white shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-indigo-900 group-hover:text-indigo-700 transition-colors">
                  Créer un nouvel événement
                </p>
                <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Lancer des ventes de billets en direct</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Button to View Dashboards */}
          <div className="space-y-2">
            <div
              id="btn-toggle-dashboards"
              onClick={() => setShowEventSelector(!showEventSelector)}
              className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer group transition-all shadow-sm"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-brand-primary shrink-0 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 group-hover:text-brand-primary transition-colors">
                    Mes Tableaux de bord & Portefeuille
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Suivi des chiffres, reversements & scanneurs</p>
                </div>
              </div>
              {showEventSelector ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </div>

            {/* List of active events to choose for dashboard view */}
            {showEventSelector && (
              <div className="pl-3 pr-1 py-1 space-y-2 max-h-56 overflow-y-auto border-l-2 border-slate-200/60 ml-6 animate-fade-in">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => navigate(`/organisateur/dashboard/${evt.id}`)}
                    className="p-2.5 bg-white hover:bg-indigo-50/50 border border-slate-200 rounded-xl flex items-center gap-3 cursor-pointer transition-all shadow-sm hover:border-indigo-100"
                  >
                    <img referrerPolicy="no-referrer" src={evt.imageUrl} alt={evt.title} className="w-9 h-9 object-cover rounded-lg border border-slate-100 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-800 truncate leading-tight group-hover:text-indigo-600">
                        {evt.title}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate mt-0.5 font-mono">ID: {evt.id}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Menu Options List */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider pl-1 font-semibold">COMPTE & SÉCURITÉ</h4>
          <div className="space-y-2">
            {profileOptions.map((opt, idx) => {
              const Icon = opt.icon;
              return (
                <div
                  key={idx}
                  id={`profile-row-option-${idx}`}
                  onClick={opt.action}
                  className="p-3.5 bg-white hover:bg-slate-50/50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer group transition-all shadow-sm hover:border-slate-300"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-brand-primary shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-brand-primary transition-colors truncate">
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{opt.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Logout Row */}
        <div className="pt-2">
          <button
            id="btn-profile-logout"
            onClick={handleLogout}
            className="w-full p-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-700 tracking-wider uppercase transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>

        {/* Small version stamp */}
        <p className="text-center text-[9px] text-slate-400 font-mono pt-2 uppercase">
          IwacuTix Burundi • Architecture Cahier des Charges
        </p>
      </div>

      {/* Auth Modal for SMS OTP & Organizer Login */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        defaultTab={user.role === 'ORGANISATEUR' ? 'ORGANISATEUR' : 'ACHETEUR'}
      />
    </div>
  );
};

