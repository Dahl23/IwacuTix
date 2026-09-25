import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  Building2,
  Sparkles,
  Info,
  Mail
} from 'lucide-react';
import { api, setStoredTokens, API_BASE_URL } from '../services/apiClient';
import { useApp } from '../AppContext';
import { parseApiError } from '../utils/apiErrors';
import { apiUserToUser } from '../services/apiMappers';
import type { ApiUser, UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'ACHETEUR' | 'ORGANISATEUR';
  contextReason?: 'RESERVATION' | 'ORGANISATEUR' | 'GENERAL';
  onSuccess?: () => void;
}

type AuthMode = 'REGISTER' | 'LOGIN';

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultTab = 'ACHETEUR',
  contextReason = 'GENERAL',
  onSuccess
}) => {
  const navigate = useNavigate();
  const { user, setUser, updateUserProfile, switchPersona } = useApp();
  const [tab, setTab] = useState<'ACHETEUR' | 'ORGANISATEUR'>(
    contextReason === 'ORGANISATEUR' ? 'ACHETEUR' : defaultTab
  );
  const [mode, setMode] = useState<AuthMode>('REGISTER');

  // Register state
  const [nomComplet, setNomComplet] = useState(user.name && user.id !== 'guest' ? user.name : '');
  const [email, setEmail] = useState(user.email && user.email !== 'contact@iwacutix.bi' ? user.email : '');
  const [username, setUsername] = useState(user.username || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [newPassword, setNewPassword] = useState('');

  // Login state
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [deactivated, setDeactivated] = useState(false);

  if (!isOpen) return null;

  const hasAnyIdentifier = email.trim().length > 0 || phone.trim().length > 0 || username.trim().length > 0;

  const handleClose = () => {
    setError(null);
    setSuccessMsg(null);
    onClose();
  };

  const applyUser = (apiUser: ApiUser) => {
    const mapped = apiUserToUser(apiUser, user, API_BASE_URL);
    setUser(mapped);
    updateUserProfile(mapped);
  };

  const finishSuccess = (role?: UserRole) => {
    setTimeout(() => {
      onClose();
      if (role === 'ORGANISATEUR') {
        navigate('/organisateur');
      } else if (role === 'SUPERADMIN') {
        navigate('/admin/superadmin');
      } else if (onSuccess) {
        onSuccess();
      } else if (contextReason === 'RESERVATION') {
        navigate('/paiement');
      } else if (contextReason === 'ORGANISATEUR') {
        switchPersona('ORGANISATEUR');
        navigate('/organisateur');
      }
    }, 800);
  };

  // 1. Inscription commune à tous les rôles (email / téléphone / username optionnels, au moins un identifiant)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!hasAnyIdentifier) {
      setError('Veuillez renseigner au moins un identifiant : email, téléphone ou nom d\'utilisateur.');
      return;
    }
    if (!newPassword) {
      setError('Veuillez choisir un mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.register({
        email: email.trim() || undefined,
        username: username.trim() || undefined,
        telephone: phone.trim() || undefined,
        password: newPassword,
        nom_complet: nomComplet.trim() || 'Acheteur IwacuTix',
      });
      setStoredTokens(res.access, res.refresh);
      applyUser(res.user);

      setSuccessMsg('Compte créé avec succès ! Vous êtes connecté. 🎉');
      if (res.user.email && !res.user.email_verifie) {
        setEmailSent(false);
      }
      finishSuccess(res.user.role);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Envoyer l'email de vérification (bandeau après inscription)
  const handleVerifyEmail = async () => {
    if (loading) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await api.auth.verifierEmail();
      setEmailSent(true);
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Connexion commune à tous les rôles (erreur unique anti-énumération)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await api.auth.login(identifiant.trim(), password);
      setStoredTokens(res.access, res.refresh);
      applyUser(res.user);

      if (res.user.statut_compte === 'DESACTIVE') {
        setDeactivated(true);
        setSuccessMsg('Votre compte est actuellement désactivé.');
        return;
      }

      setSuccessMsg(`Connexion réussie (${res.user.role}) !`);
      finishSuccess(res.user.role);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Réactivation du compte désactivé (JWT encore valide)
  const handleReactivate = async () => {
    if (loading) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await api.auth.reactiver();
      const me = await api.auth.me();
      applyUser(me);
      setDeactivated(false);
      setSuccessMsg('Compte réactivé avec succès ! Bienvenue. 🎉');
      finishSuccess(me.role);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-brand-slate rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-brand-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm">
                {mode === 'REGISTER' ? 'Créer un compte' : 'Connexion à votre compte'}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Billetterie sécurisée IwacuTix</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contextual notification banners */}
        {contextReason === 'RESERVATION' && (
          <div className="bg-orange-500/10 border-b border-orange-200/60 dark:border-orange-500/20 px-4 py-2.5 flex items-start gap-2.5">
            <Mail className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-orange-950 dark:text-orange-200 leading-snug">
              <strong>Réservation en cours :</strong> Créez votre compte en quelques secondes pour finaliser l'achat et recevoir vos billets avec QR codes.
            </p>
          </div>
        )}

        {contextReason === 'ORGANISATEUR' && (
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-800/60 px-4 py-2.5 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-indigo-950 dark:text-indigo-200 leading-snug">
              <strong>Étape préalable :</strong> Créez votre compte pour ensuite activer votre espace organisateur.
            </p>
          </div>
        )}

        {/* Tab switcher */}
        <div className="p-2.5 bg-slate-50 dark:bg-brand-dark border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
          <button
            onClick={() => { setTab('ACHETEUR'); setError(null); }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'ACHETEUR'
                ? 'bg-white dark:bg-brand-slate text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-brand-primary" />
            Acheteur
          </button>
          <button
            onClick={() => { setTab('ORGANISATEUR'); setError(null); }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'ORGANISATEUR'
                ? 'bg-white dark:bg-brand-slate text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            Pro (Organisateur)
          </button>
        </div>

        {/* Content area */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5">

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Compte désactivé → réactivation */}
          {deactivated ? (
            <form onSubmit={(e) => { e.preventDefault(); handleReactivate(); }} className="space-y-3.5">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                <strong>Votre compte est désactivé.</strong> Vous ne pouvez plus passer de commande ni organiser d'événements tant qu'il est désactivé. Vous pouvez le réactiver immédiatement.
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {loading ? 'Réactivation en cours...' : 'Réactiver mon compte'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <p className="text-[10px] text-slate-400 text-center">
                Au-delà de la réactivation, votre compte reprend son état normal (ACTIF).
              </p>
            </form>
          ) : mode === 'REGISTER' ? (
            <form onSubmit={handleRegister} className="space-y-3">
              {/* Nom complet */}
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Nom et prénom complets</span>
                  <span className="text-[10px] text-slate-400 font-medium">Optionnel</span>
                </label>
                <input
                  type="text"
                  value={nomComplet}
                  onChange={(e) => setNomComplet(e.target.value)}
                  placeholder="Ex. Dahl Ndayisenga"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400">
                  Sera imprimé sur vos billets nominatifs si renseigné.
                </p>
              </div>

              {/* Email */}
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Adresse email</span>
                  <span className="text-[10px] text-slate-400 font-medium">Conseillé</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400"
                />
              </div>

              {/* Téléphone */}
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Numéro de téléphone (+257)</span>
                  <span className="text-[10px] text-slate-400 font-medium">Optionnel</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+257 69 123 456"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Username */}
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Nom d'utilisateur</span>
                  <span className="text-[10px] text-slate-400 font-medium">Optionnel</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="pseudo"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400">
                  Renseignez au moins un identifiant (email, téléphone ou pseudo).
                </p>
              </div>

              {/* Mot de passe */}
              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-700">Mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
                <p className="text-[10px] text-slate-400">
                  La robustesse est vérifiée lors de l'inscription.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword.trim()}
                className="w-full py-3 bg-brand-primary hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md shadow-brand-primary/20 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {loading ? 'Création en cours...' : 'Créer mon compte'}
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>

              {/* Bandeau vérification email après inscription avec email */}
              {successMsg && email.trim().length > 0 && !emailSent && (
                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between gap-2">
                  <span className="text-[10px] text-sky-900 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    Vérifiez votre email
                  </span>
                  <button
                    type="button"
                    onClick={handleVerifyEmail}
                    disabled={loading}
                    className="text-[10px] font-bold text-sky-700 underline disabled:opacity-50 cursor-pointer"
                  >
                    {emailSent ? 'Email envoyé ✓' : 'Envoyer le lien'}
                  </button>
                </div>
              )}

              {/* Lien vers connexion */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('LOGIN'); setError(null); }}
                  className="text-[11px] font-bold text-brand-primary hover:underline cursor-pointer"
                >
                  Déjà un compte ? Se connecter
                </button>
                <span className="mx-1.5 text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => { handleClose(); navigate('/mot-de-passe-oublie'); }}
                  className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                Connexion sécurisée commune à tous les rôles (Acheteur, Organisateur, Administration).
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-700">Identifiant (Email, Téléphone ou Username)</label>
                <input
                  type="text"
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  placeholder="vous@exemple.com ou +257..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-700">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
                <KeyRound className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('REGISTER'); setError(null); }}
                  className="text-[11px] font-bold text-brand-primary hover:underline cursor-pointer"
                >
                  Pas encore de compte ? Créer un compte
                </button>
                <span className="mx-1.5 text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => { handleClose(); navigate('/mot-de-passe-oublie'); }}
                  className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 font-mono">
            Connexion & inscription sécurisées — Aucun SMS requis. Validation email & mot de passe.
          </p>
        </div>

      </div>
    </div>
  );
};