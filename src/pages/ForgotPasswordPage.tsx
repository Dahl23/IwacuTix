import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient';
import { parseApiError } from '../utils/apiErrors';
import { ArrowLeft, Mail, Send, ShieldCheck, Clock, AlertCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [identifiant, setIdentifiant] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Réponse générique obligatoire (anti-énumération) : on affiche toujours le même message
  const GENERIC_SUCCESS =
    'Si cette adresse email ou ce numéro est associé à un compte IwacuTix, un email de réinitialisation vient d\'être envoyé (valable 1 heure).';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!identifiant.trim()) {
      setFeedback({ type: 'error', text: 'Veuillez saisir votre email, numéro de téléphone ou nom d\'utilisateur.' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.passwordResetRequest(identifiant.trim());
      setFeedback({ type: 'success', text: res?.message || GENERIC_SUCCESS });
      setTimeout(() => navigate('/reset-password'), 2500);
    } catch (err) {
      const { message, code } = parseApiError(err);
      if (code === 'TOO_MANY_REQUESTS' || /429|trop|reessayez/.test(message)) {
        setFeedback({
          type: 'error',
          text: 'Trop de demandes de réinitialisation. Veuillez patienter quelques minutes avant de réessayer.',
        });
      } else {
        // Anti-énumération : même réponse générique en cas d'erreur d'envoi
        setFeedback({ type: 'success', text: GENERIC_SUCCESS });
        setTimeout(() => navigate('/reset-password'), 2500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] dark:bg-brand-dark transition-colors duration-200">
      <div className="px-5 pt-4 pb-2 sticky top-0 bg-white/95 dark:bg-brand-dark/95 backdrop-blur-md z-30 border-b border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">Mot de passe oublié</h2>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
          Compte & Sécurité
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col items-center justify-center text-center space-y-4">
        <form
          onSubmit={handleSubmit}
          className="p-6 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm w-full max-w-sm space-y-3.5 text-left"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed text-center">
            Saisissez l'identifiant de votre compte (email, numéro de téléphone ou nom d'utilisateur). Nous enverrons un lien de réinitialisation par email.
          </p>

          {feedback && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 animate-fade-in border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {feedback.type === 'success' ? (
                <Send className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span>Identifiant (Email, Téléphone ou Username)</span>
              <span className="text-[10px] text-brand-primary font-semibold">Obligatoire</span>
            </label>
            <input
              type="text"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="vous@exemple.com ou +257..."
              required
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !identifiant.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <Mail className="w-3.5 h-3.5" />
            {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
          </button>

          <div className="pt-1 flex items-center justify-center gap-1 text-[10px] text-slate-400">
            <Clock className="w-3 h-3" />
            Lien valable 1 heure — renvoyable toutes les 10 minutes maximum.
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
      </div>
    </div>
  );
};