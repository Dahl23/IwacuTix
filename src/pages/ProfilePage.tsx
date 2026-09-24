import React, { useState, useRef, useEffect } from 'react';
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
  Server,
  Camera,
  UploadCloud,
  Check,
  Edit3,
  X,
  Image as ImageIcon,
  Sun
} from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { ThemeToggle } from '../components/ThemeToggle';
import { api, getStoredAccessToken, API_BASE_URL } from '../services/apiClient';
import { toAbsoluteApiUrl } from '../services/apiMappers';
import { DEFAULT_ANONYMOUS_AVATAR } from '../data';

const AVATAR_PRESETS = [
  { id: '0', name: 'Silhouette Neutre', url: DEFAULT_ANONYMOUS_AVATAR },
  { id: '1', name: 'Professionnel Homme', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' },
  { id: '2', name: 'Professionnelle Femme', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80' },
  { id: '3', name: 'Jeune Leader', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
  { id: '4', name: 'Entrepreneur Buja', url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&auto=format&fit=crop&q=80' },
  { id: '5', name: 'Créatrice Digitale', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80' },
];

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user, 
    updateUserProfile,
    tickets, 
    events, 
    followedEventIds, 
    currentPersona, 
    scanneurAssignments,
    portefeuille,
    isUserVerified,
    logoutUser,
    openAuthModal
  } = useApp();
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Profile Customization States
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [fullNameInput, setFullNameInput] = useState(user.name);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditingName) {
      setFullNameInput(user.name);
    }
  }, [user.name, isEditingName]);

  const extractPhotoUrl = (res: unknown): string => {
    if (!res || typeof res !== 'object') return '';
    const r = res as Record<string, unknown>;
    const userObj = r.user && typeof r.user === 'object' ? (r.user as Record<string, unknown>) : null;
    const candidate =
      r.url_photo_profil ||
      r.photo_profil ||
      r.url ||
      r.avatarUrl ||
      (userObj && (userObj.url_photo_profil || userObj.avatarUrl));
    return typeof candidate === 'string' ? toAbsoluteApiUrl(candidate, API_BASE_URL) : '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'L\'image ne doit pas dépasser 5 Mo.' });
      return;
    }

    const applyLocalPreview = (dataUrl?: string) => {
      if (dataUrl) updateUserProfile({ avatarUrl: dataUrl });
    };

    try {
      const res = await api.auth.updatePhotoProfil(file);
      const serverUrl = extractPhotoUrl(res);
      if (serverUrl) {
        updateUserProfile({ avatarUrl: serverUrl });
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') applyLocalPreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
      setShowPhotoModal(false);
      setFeedback({ type: 'success', text: 'Photo de profil mise à jour avec succès !' });
      setTimeout(() => setFeedback(null), 3500);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') applyLocalPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setShowPhotoModal(false);
      setFeedback({ type: 'success', text: 'Photo enregistrée localement (backend hors-ligne).' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleResetPhoto = async () => {
    updateUserProfile({ avatarUrl: DEFAULT_ANONYMOUS_AVATAR });
    setShowPhotoModal(false);
    setFeedback({ type: 'success', text: 'Photo réinitialisée avec la silhouette neutre.' });
    setTimeout(() => setFeedback(null), 3000);
    try {
      await api.auth.deletePhotoProfil();
    } catch {}
  };

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrlInput.trim()) return;
    updateUserProfile({ avatarUrl: photoUrlInput.trim() });
    setShowPhotoModal(false);
    setPhotoUrlInput('');
    setFeedback({ type: 'success', text: 'Photo de profil mise à jour avec succès !' });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSelectPreset = (url: string) => {
    updateUserProfile({ avatarUrl: url });
    setShowPhotoModal(false);
    setFeedback({ type: 'success', text: 'Photo de profil mise à jour avec succès !' });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleSaveFullName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameInput.trim()) {
      setFeedback({ type: 'error', text: 'Veuillez saisir un nom complet valide.' });
      return;
    }
    updateUserProfile({ name: fullNameInput.trim() });
    setIsEditingName(false);
    setFeedback({ type: 'success', text: 'Nom complet enregistré avec succès !' });
    setTimeout(() => setFeedback(null), 3500);
  };

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
      logoutUser();
      navigate('/');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] dark:bg-brand-dark transition-colors duration-200">
      
      {/* Top Header */}
      <div className="px-5 pt-4 pb-2 sticky top-0 bg-white/95 dark:bg-brand-dark/95 backdrop-blur-md z-30 border-b border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">Mon Profil</h2>
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

      {/* Real-time Feedback Banner */}
      {feedback && (
        <div className={`mx-5 mt-3 p-3 rounded-2xl text-xs font-bold flex items-center justify-between border shadow-sm animate-fade-in ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border-rose-200'
        }`}>
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            {feedback.text}
          </span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Profile Info Card Header */}
      <div className="p-5 flex flex-col items-center text-center space-y-4">
        
        {/* Rounded Avatar with Camera Edit Button */}
        <div className="flex flex-col items-center space-y-2">
          <div className="relative">
            <div 
              onClick={() => setShowPhotoModal(true)}
              className="w-24 h-24 rounded-full p-1 border-2 border-brand-primary bg-white shadow-xl overflow-hidden relative group cursor-pointer active:scale-95 transition-all"
              title="Cliquer pour changer votre photo de profil"
            >
              <img 
                referrerPolicy="no-referrer"
                src={user.avatarUrl} 
                alt={user.name} 
                className="w-full h-full object-cover rounded-full" 
              />
              {/* Hover overlay with Camera */}
              <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-full">
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-bold">Modifier</span>
              </div>
            </div>

            {/* Quick Floating Camera Button */}
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-brand-primary hover:bg-orange-600 text-white shadow-lg border-2 border-white cursor-pointer active:scale-90 transition-transform"
              title="Changer la photo de profil"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPhotoModal(true)}
            className="text-[11px] font-bold text-brand-primary hover:text-orange-700 inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-orange-50 hover:bg-orange-100/80 transition-colors border border-orange-200/60 cursor-pointer"
          >
            <Camera className="w-3 h-3" />
            <span>Modifier la photo de profil</span>
          </button>
        </div>

        {/* Full Name Display and Edit (Nom complet issu de la création du compte) */}
        <div className="w-full max-w-sm space-y-1">
          {!isEditingName ? (
            <div className="flex items-center justify-center gap-2 group">
              <h3 className="text-xl font-display font-bold text-slate-900 tracking-tight">
                {user.name}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setFullNameInput(user.name);
                  setIsEditingName(true);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-brand-primary hover:bg-orange-50 transition-colors cursor-pointer"
                title="Modifier mon nom complet officiel"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveFullName} className="p-3 bg-white border border-brand-primary/40 rounded-2xl shadow-md space-y-2.5 text-left animate-fade-in">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Nom complet officiel (Prénom & Nom)
                </label>
                <input
                  type="text"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  placeholder="Ex: Dahl Ndayisenga"
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors"
                />
                <p className="text-[9px] text-slate-400 mt-1">
                  Ce nom complet officiel correspond à votre identité lors de la création de compte et figure sur vos billets nominatifs.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-brand-primary hover:bg-orange-600 text-[11px] font-bold text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          )}
          
          {!isUserVerified && (
            <div className="pt-2">
              <p className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider bg-amber-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-amber-200">
                COMPTE INVITÉ • NON VÉRIFIÉ
              </p>
              <button
                onClick={() => openAuthModal('GENERAL')}
                className="mt-2.5 w-full py-2 px-4 rounded-xl bg-brand-primary hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Créer mon compte Acheteur (Nom, Prénom & N°)</span>
              </button>
            </div>
          )}

          {isUserVerified && user.role === 'ORGANISATEUR' && (
            <p className="text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-indigo-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              KYC VÉRIFIÉ • {user.organisateurProfile?.nom_structure || "Vital'O FC"}
            </p>
          )}

          {isUserVerified && user.role === 'SUPERADMIN' && (
            <p className="text-[10px] font-mono font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-purple-200">
              <Lock className="w-3 h-3 text-purple-600" />
              ADMINISTRATION PLATEFORME HQ
            </p>
          )}

          {isUserVerified && user.role === 'ACHETEUR' && currentPersona !== 'SCANNEUR' && (
            <p className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full inline-block border border-emerald-200">
              ACHETEUR AUTHENTIFIÉ (OTP) ✓
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
              {user.phone ? user.phone.replace('+257 ', '') : 'Non configuré'}
            </span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5 text-left shadow-sm">
            <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider block">Email</span>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="truncate">{user.email ? user.email.split('@')[0] : 'Non configuré'}</span>
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
            onClick={() => {
              if (!isUserVerified) {
                openAuthModal("Pour créer des événements et devenir organisateur, vous devez d'abord vous connecter avec votre compte acheteur.");
                return;
              }
              navigate('/organisateur/creer');
            }}
            className="p-3.5 bg-gradient-to-r from-indigo-500/10 to-indigo-600/5 hover:from-indigo-500/15 hover:to-indigo-600/10 border border-indigo-200 dark:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer group transition-all shadow-sm"
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

        {/* Appearance & Dark Mode Settings Card */}
        <div className="p-4 bg-white dark:bg-brand-slate border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-3 shadow-sm text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-500/30 text-brand-primary shrink-0">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Thème & Affichage
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Palette IwacuTix avec noir profond (#090A0F) et ardoise nuit (#0F172A)
              </p>
            </div>
          </div>
          <ThemeToggle variant="segmented" />
        </div>

        {/* Menu Options List */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1 font-semibold">COMPTE & SÉCURITÉ</h4>
          <div className="space-y-2">
            {profileOptions.map((opt, idx) => {
              const Icon = opt.icon;
              return (
                <div
                  key={idx}
                  id={`profile-row-option-${idx}`}
                  onClick={opt.action}
                  className="p-3.5 bg-white dark:bg-brand-slate hover:bg-slate-50/50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between cursor-pointer group transition-all shadow-sm hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-brand-primary shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-primary transition-colors truncate">
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{opt.description}</p>
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

      {/* Hidden File Input for Direct Local Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Profile Photo Customization Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border-b border-orange-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-primary text-white shadow-xs">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900">Photo de profil</h3>
                  <p className="text-[10px] text-slate-500">Personnalisez l'avatar de votre compte IwacuTix</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Option A: Upload from phone/camera */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                  1. Depuis votre appareil
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-orange-300 hover:border-brand-primary bg-orange-50/40 hover:bg-orange-50 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer active:scale-98"
                >
                  <div className="p-3 rounded-full bg-white shadow-sm text-brand-primary group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-800">
                      Choisir une photo de la galerie ou prendre une photo
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      PNG, JPG, WEBP jusqu'à 5 Mo
                    </p>
                  </div>
                </button>
              </div>

              {/* Option B: Pick curated avatar presets */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                  2. Ou choisir parmi les avatars prédéfinis
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.url)}
                      className="p-2 rounded-2xl border border-slate-200 hover:border-brand-primary hover:bg-orange-50/50 flex flex-col items-center gap-1.5 transition-all group cursor-pointer text-center"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-xs group-hover:scale-105 transition-transform">
                        <img referrerPolicy="no-referrer" src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-700 leading-tight truncate w-full">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Option C: Image URL */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                  3. Ou via un lien web direct (URL)
                </span>
                <form onSubmit={handleApplyUrl} className="flex gap-2">
                  <input
                    type="url"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    placeholder="https://exemple.com/ma-photo.jpg"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-primary focus:bg-white transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!photoUrlInput.trim()}
                    className="px-4 py-2 bg-brand-primary hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Appliquer
                  </button>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => void handleResetPhoto()}
                className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Réinitialiser (Silhouette neutre)
              </button>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

