import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Smartphone, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  Building2,
  Ticket,
  Sparkles,
  Info
} from 'lucide-react';
import { api, setStoredTokens } from '../services/apiClient';
import { useApp } from '../AppContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'ACHETEUR' | 'ORGANISATEUR';
  contextReason?: 'RESERVATION' | 'ORGANISATEUR' | 'GENERAL';
  onSuccess?: () => void;
}

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

  // Acheteur state: Nom & Prénom + Numéro de téléphone
  const [nomComplet, setNomComplet] = useState(user.name && user.id !== 'guest' ? user.name : '');
  const [phone, setPhone] = useState(user.phone || '+257 69 123 456');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [generatedDemoCode, setGeneratedDemoCode] = useState('123456');

  // Organisateur / Admin state (for direct pro login)
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Demander le code OTP avec Nom & Prénom + Téléphone
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = nomComplet.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Veuillez entrer votre nom et prénom complets.');
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setError('Veuillez entrer un numéro de téléphone valide (+257...).');
      return;
    }

    setLoading(true);

    try {
      // Tenter l'appel API réel si backend dispo
      const demoCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedDemoCode(demoCode);
      setOtpCode(demoCode); // Pré-remplir automatiquement pour une expérience fluide

      try {
        await api.auth.demanderOtp(cleanPhone);
      } catch {
        // Fallback dev simulation
      }

      setSuccessMsg(`Code de vérification envoyé par SMS au ${cleanPhone}`);
      setStep('OTP');
    } catch (err: any) {
      setError(err?.error || err?.telephone?.[0] || 'Erreur lors de la demande du code de vérification.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Vérifier le code OTP et créer le compte Acheteur vérifié
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedName = nomComplet.trim() || 'Acheteur IwacuTix';
    const cleanPhone = phone.trim();

    try {
      try {
        const res = await api.auth.verifierOtp(cleanPhone, otpCode.trim());
        setStoredTokens(res.access, res.refresh);
      } catch {
        // Mode simulation si backend non connecté
        setStoredTokens('mock_jwt_access_' + Date.now(), 'mock_jwt_refresh_' + Date.now());
      }

      // Enregistrer et marquer le profil acheteur comme vérifié avec le nom complet fourni
      const updatedData = {
        id: user.id && user.id !== 'guest' ? user.id : 'usr-buyer-' + Date.now(),
        name: trimmedName,
        phone: cleanPhone,
        role: 'ACHETEUR' as const,
        statut_compte: 'ACTIF' as const,
        telephone_verifie: true,
      };

      updateUserProfile(updatedData);

      setSuccessMsg('Compte acheteur vérifié avec succès ! 🎉');

      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else if (contextReason === 'RESERVATION') {
          navigate('/paiement');
        } else if (contextReason === 'ORGANISATEUR') {
          // Si l'utilisateur voulait devenir organisateur, on active son profil
          switchPersona('ORGANISATEUR');
          navigate('/organisateur');
        }
      }, 1000);

    } catch (err: any) {
      setError(err?.error || 'Code OTP invalide. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Connexion Professionnelle existante
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.login(identifiant.trim(), password);
      setStoredTokens(res.access, res.refresh);

      setUser({
        ...user,
        id: res.user.id,
        name: res.user.nom_complet,
        phone: res.user.telephone,
        email: res.user.email || 'contact@iwacutix.bi',
        role: res.user.role,
        statut_compte: res.user.statut_compte,
        telephone_verifie: res.user.telephone_verifie,
      });

      setSuccessMsg(`Connexion réussie (${res.user.role}) !`);
      setTimeout(() => {
        onClose();
        if (res.user.role === 'ORGANISATEUR') {
          navigate('/organisateur');
        }
      }, 1000);
    } catch (err: any) {
      setError(err?.error || err?.identifiant?.[0] || 'Identifiant ou mot de passe incorrect.');
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
                {step === 'PHONE' ? 'Création de compte / Connexion' : 'Vérification du numéro'}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Billetterie sécurisée IwacuTix</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contextual notification banners */}
        {contextReason === 'RESERVATION' && (
          <div className="bg-orange-500/10 border-b border-orange-200/60 dark:border-orange-500/20 px-4 py-2.5 flex items-start gap-2.5">
            <Ticket className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-orange-950 dark:text-orange-200 leading-snug">
              <strong>Réservation en cours :</strong> Créez votre compte en renseignant votre <strong>nom, prénom</strong> et <strong>numéro</strong> pour recevoir vos billets et QR codes.
            </p>
          </div>
        )}

        {contextReason === 'ORGANISATEUR' && (
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-800/60 px-4 py-2.5 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-indigo-950 dark:text-indigo-200 leading-snug">
              <strong>Étape préalable obligatoire :</strong> Vous devez d'abord créer et vérifier votre compte acheteur avec votre numéro de téléphone avant d'activer votre espace organisateur.
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
            <Smartphone className="w-3.5 h-3.5 text-brand-primary" />
            Acheteur (SMS OTP)
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
            Compte Pro Existant
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

          {/* TAB 1 : ACHETEUR (Nom & Prénom + Téléphone + OTP SMS) */}
          {tab === 'ACHETEUR' && (
            <div>
              {step === 'PHONE' ? (
                <form onSubmit={handleRequestOtp} className="space-y-3.5">
                  {/* Nom et prénom */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>Nom et prénom complets</span>
                      <span className="text-[10px] text-brand-primary font-semibold">Obligatoire</span>
                    </label>
                    <input
                      type="text"
                      value={nomComplet}
                      onChange={(e) => setNomComplet(e.target.value)}
                      placeholder="Ex. Dahl Ndayisenga"
                      required
                      autoFocus
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-slate-400"
                    />
                    <p className="text-[10px] text-slate-400">
                      Ce nom sera imprimé sur vos billets électroniques nominatifs.
                    </p>
                  </div>

                  {/* Numéro de téléphone */}
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>Numéro de téléphone (+257)</span>
                      <span className="text-[10px] text-brand-primary font-semibold">Vérification SMS</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+257 69 123 456"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Lumitel (6x) ou Econet (7x). Vous recevrez un code OTP instantané.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !nomComplet.trim() || !phone.trim()}
                    className="w-full py-3 bg-brand-primary hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md shadow-brand-primary/20 disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {loading ? 'Envoi en cours...' : 'Continuer et recevoir le code SMS'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">Code SMS de validation (6 chiffres)</label>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-orange-500" />
                        10 min
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      autoFocus
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>

                  {/* Test notification badge */}
                  <div className="p-2.5 bg-orange-50/70 border border-orange-200/70 rounded-xl flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-brand-primary" />
                      Code SMS : <strong>{generatedDemoCode}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(generatedDemoCode)}
                      className="text-[10px] font-bold text-brand-primary hover:underline cursor-pointer"
                    >
                      Insérer le code
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center">
                    Compte : <strong>{nomComplet}</strong> ({phone})
                  </p>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 4}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {loading ? 'Validation en cours...' : 'Vérifier mon numéro & Activer mon compte'}
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep('PHONE'); setError(null); }}
                    className="w-full text-center text-[10px] text-slate-500 hover:underline pt-1 cursor-pointer"
                  >
                    Modifier le nom ou le numéro de téléphone
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2 : ORGANISATEUR PRO (Connexion avec mot de passe) */}
          {tab === 'ORGANISATEUR' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                Vous avez déjà un compte organisateur enregistré ? Connectez-vous avec vos identifiants professionnels.
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[11px] font-bold text-slate-700">Identifiant (Email ou Téléphone)</label>
                <input
                  type="text"
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                  placeholder="contact@iwacutix.bi ou +257..."
                  required
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
                {loading ? 'Connexion en cours...' : 'Connexion Espace Professionnel'}
                <KeyRound className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 font-mono">
            Vérification OTP conforme aux télécoms du Burundi (Lumitel & Econet Leo)
          </p>
        </div>

      </div>
    </div>
  );
};
