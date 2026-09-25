import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/apiClient';
import { parseApiError } from '../utils/apiErrors';
import { ArrowLeft, KeyRound, AlertCircle, CheckCircle2, ShieldCheck, Clock, Info, Mail } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlCode = searchParams.get('code') || '';
  const urlEmail = searchParams.get('email') || '';

  const [identifiant, setIdentifiant] = useState(urlEmail || '');
  const [code, setCode] = useState(urlCode);
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [consumed, setConsumed] = useState(false);
  const [retryBlocked, setRetryBlocked] = useState(false);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!identifiant.trim()) {
      setFeedback({ type: 'error', text: 'Veuillez saisir votre identifiant (email, téléphone ou username).' });
      return;
    }
    if (!code.trim()) {
      setFeedback({ type: 'error', text: 'Veuillez saisir le code de réinitialisation reçu par email.' });
      return;
    }
    if (!nouveauMdp || nouveauMdp.length < 8) {
      setFeedback({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères.' });
      return;
    }
    if (nouveauMdp !== confirmation) {
      setFeedback({ type: 'error', text: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.passwordResetConfirm({
        identifiant: identifiant.trim(),
        code: code.trim(),
        nouveau_mdp: nouveauMdp,
      });
      setConsumed(true);
      setFeedback({
        type: 'success',
        text: res?.message || 'Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.',
      });
      setTimeout(() => navigate('/'), 2500);
    } catch (err) {
      const { message, code: apiCode } = parseApiError(err);
      if (apiCode === 'token_expire') {
        setFeedback({ type: 'error', text: message || 'Ce code a expiré (validité 1 heure). Veuillez relancer une demande.' });
      } else if (apiCode === 'token_invalide') {
        setFeedback({ type: 'error', text: message || 'Code invalide. Vérifiez le code reçu dans votre email.' });
      } else if (apiCode === 'tentatives_epuisees' || /tentatives?/.test(message)) {
        setRetryBlocked(true);
        setFeedback({ type: 'error', text: message || 'Trop de tentatives échouées. Redemandez un nouveau code.' });
      } else if (/429|trop|reessayez/i.test(message)) {
        setRetryBlocked(true);
        setFeedback({ type: 'error', text: message || 'Trop de tentatives. Veuillez patienter quelques minutes.' });
      } else {
        setFeedback({ type: 'error', text: message || 'Impossible de réinitialiser le mot de passe.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] dark:bg-brand-dark transition-colors duration-200">
      <div className="px-5 pt-4 pb-2 sticky top-0 bg-white/95 dark:bg-brand-dark/95 backdrop-blur-md z-30 border-b border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">Réinitialiser le mot de passe</h2>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
          Compte & Sécurité
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col items-center justify-center text-center space-y-4">
        {consumed ? (
          <div className="p-6 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm w-full max-w-sm space-y-3 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Mot de passe mis à jour</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{feedback?.text}</p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-brand-primary hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              Aller à l'Accueil
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleConfirm}
            className="p-6 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm w-full max-w-sm space-y-3.5 text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed text-center">
              Saisissez le code reçu par email et votre nouveau mot de passe.
            </p>

            {feedback && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 animate-fade-in border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Mail className="w-3 h-3 text-indigo-500" />
                Identifiant (Email, Téléphone ou Username)
              </label>
              <input
                type="text"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                placeholder="vous@exemple.com"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-400"
              />
              {urlEmail && (
                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Pré-rempli depuis le lien reçu par email.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-indigo-500" />
                Code de réinitialisation
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={urlCode ? 'Code reçu par email' : 'XXXXXX'}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-400"
              />
              {urlCode && (
                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Code détecté dans le lien. Vous pouvez le modifier si besoin.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Nouveau mot de passe</label>
              <input
                type="password"
                value={nouveauMdp}
                onChange={(e) => setNouveauMdp(e.target.value)}
                placeholder="8 caractères minimum"
                required
                minLength={8}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Retapez le mot de passe"
                required
                minLength={8}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading || retryBlocked}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {loading ? 'Réinitialisation en cours...' : 'Réinitialiser mon mot de passe'}
            </button>

            <div className="pt-1 flex items-center justify-center gap-1 text-[10px] text-slate-400">
              <Clock className="w-3 h-3" />
              5 tentatives maximum — après 5 échecs, demandez un nouveau code.
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour
            </button>
          </form>
        )}
      </div>
    </div>
  );
};