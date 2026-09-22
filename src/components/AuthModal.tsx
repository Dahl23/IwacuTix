import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Lock, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  User,
  Building2
} from 'lucide-react';
import { api, setStoredTokens } from '../services/apiClient';
import { useApp } from '../AppContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'ACHETEUR' | 'ORGANISATEUR';
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultTab = 'ACHETEUR' 
}) => {
  const { user, setUser } = useApp();
  const [tab, setTab] = useState<'ACHETEUR' | 'ORGANISATEUR'>(defaultTab);

  // Acheteur OTP state
  const [phone, setPhone] = useState('+25779123456');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [otpCountdown, setOtpCountdown] = useState<number>(600); // 10 minutes (AUTH_OTP_LIFETIME_MINUTES)
  
  // Organisateur / Admin state
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Demander le code OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.demanderOtp(phone.trim());
      setSuccessMsg(`Code OTP envoyé au ${res.telephone} (en dev: vérifiez la console serveur)`);
      setStep('OTP');
      setOtpCountdown(600);
    } catch (err: any) {
      setError(err?.error || err?.telephone?.[0] || 'Erreur lors de la demande d\'OTP');
    } finally {
      setLoading(false);
    }
  };

  // 2. Vérifier le code OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.verifierOtp(phone.trim(), otpCode.trim());
      setStoredTokens(res.access, res.refresh);

      // Mettre à jour l'utilisateur dans le context
      setUser({
        ...user,
        id: res.user.id,
        name: res.user.nom_complet,
        phone: res.user.telephone,
        role: res.user.role,
        statut_compte: res.user.statut_compte,
        telephone_verifie: res.user.telephone_verifie,
      });

      setSuccessMsg('Connexion réussie par OTP ! Bienvenue sur IwacuTix.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.error || 'Code OTP invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Connexion Organisateur / SuperAdmin
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
      }, 1200);
    } catch (err: any) {
      setError(err?.error || err?.identifiant?.[0] || 'Identifiant ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-brand-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-sm">Authentification IwacuTix</h3>
              <p className="text-[10px] text-slate-400 font-mono">Conforme API_FRONTEND.md (Section 1)</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher: Acheteur OTP vs Organisateur Mot de passe */}
        <div className="p-3 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-2">
          <button
            onClick={() => { setTab('ACHETEUR'); setError(null); }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tab === 'ACHETEUR'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-brand-primary" />
            Acheteur (OTP)
          </button>
          <button
            onClick={() => { setTab('ORGANISATEUR'); setError(null); }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tab === 'ORGANISATEUR'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            Organisateur / Pro
          </button>
        </div>

        {/* Content area */}
        <div className="p-5 flex-1 space-y-4">

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1 : ACHETEUR (OTP SMS) */}
          {tab === 'ACHETEUR' && (
            <div>
              {step === 'PHONE' ? (
                <form onSubmit={handleRequestOtp} className="space-y-3.5">
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-slate-700">Numéro de téléphone (+257)</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+25779123456"
                        required
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Format international avec indicatif (ex. +25779123456). Aucun mot de passe requis !
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-brand-primary hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md shadow-brand-primary/20 disabled:opacity-50"
                  >
                    {loading ? 'Envoi du code...' : 'Recevoir mon code OTP'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700">Code à 6 chiffres</label>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-orange-500" />
                        Expire dans 10 min
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
                    <p className="text-[10px] text-slate-400 text-center">
                      Envoyé à <strong>{phone}</strong> (5 tentatives autorisées)
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 4}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                  >
                    {loading ? 'Validation en cours...' : 'Confirmer et me connecter'}
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep('PHONE'); setError(null); }}
                    className="w-full text-center text-[10px] text-slate-500 hover:underline pt-1"
                  >
                    Changer de numéro de téléphone
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2 : ORGANISATEUR / SUPERADMIN (Login Password) */}
          {tab === 'ORGANISATEUR' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
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
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
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
            JWT Access : 60 min • Refresh : 7 jours avec rotation
          </p>
        </div>

      </div>
    </div>
  );
};
