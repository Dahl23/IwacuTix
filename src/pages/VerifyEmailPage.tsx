import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api } from '../services/apiClient';
import { parseApiError } from '../utils/apiErrors';
import { CheckCircle2, AlertCircle, Clock, MailCheck, Info } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, updateUserProfile } = useApp();
  const code = searchParams.get('code') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const ranRef = useRef(false);

  useEffect(() => {
    const confirm = async () => {
      if (!code.trim()) {
        setStatus('error');
        setMessage('Lien incomplet : aucun code de vérification trouvé dans l\'URL.');
        setCanResend(true);
        return;
      }
      if (ranRef.current) return;
      ranRef.current = true;
      setStatus('loading');
      try {
        const res = await api.auth.confirmerVerifierEmail(code.trim());
        updateUserProfile({ email_verifie: true });
        setStatus('success');
        setMessage(res?.detail || 'Adresse email vérifiée avec succès !');
      } catch (err) {
        const { message: apiMessage, code: apiCode } = parseApiError(err);
        setStatus('error');
        if (apiCode === 'token_expire') {
          setMessage(apiMessage || 'Ce lien de vérification a expiré (validité 1 heure).');
          setCanResend(true);
        } else if (apiCode === 'token_invalide') {
          setMessage(apiMessage || 'Ce lien de vérification est invalide. Vérifiez l\'URL reçue par email.');
          setCanResend(false);
        } else {
          setMessage(apiMessage || 'Impossible de vérifier l\'email.');
          setCanResend(true);
        }
      }
    };
    confirm();
  }, [code]);

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await api.auth.verifierEmail();
      setMessage('Un nouveau lien de vérification vient d\'être envoyé par email (valable 1 heure).');
      setCanResend(false);
    } catch (err) {
      const { message: apiMessage, code: apiCode } = parseApiError(err);
      if (apiCode === 'TOO_MANY_REQUESTS' || /429|trop|reessayez/.test(apiMessage)) {
        setMessage('Trop de demandes récentes. Veuillez réessayer dans quelques minutes.');
      } else {
        setMessage(apiMessage || 'Échec de l\'envoi. Réessayez plus tard.');
      }
      setCanResend(true);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] dark:bg-brand-dark transition-colors duration-200">
      <div className="px-5 pt-4 pb-2 sticky top-0 bg-white/95 dark:bg-brand-dark/95 backdrop-blur-md z-30 border-b border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">Vérification Email</h2>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-sky-100 text-sky-800 border border-sky-200">
          Sécurité du compte
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col items-center justify-center text-center space-y-4">
        {status === 'loading' && (
          <div className="p-6 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm w-full max-w-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 text-sky-600 animate-pulse" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Confirmation en cours...</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Nous contactons le serveur IwacuTix pour valider votre lien.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="p-6 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm w-full max-w-sm space-y-3 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Email vérifié !</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{message}</p>
            <button
              onClick={() => navigate('/profil')}
              className="w-full py-3 bg-brand-primary hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              Retour à mon Profil
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="p-6 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm w-full max-w-sm space-y-3 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-sm font-bold text-red-800 dark:text-red-300">Vérification impossible</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{message}</p>

            {canResend && (
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <MailCheck className="w-3.5 h-3.5" />
                {resendLoading ? 'Envoi en cours...' : 'Recevoir un nouveau lien'}
              </button>
            )}

            <button
              onClick={() => navigate('/profil')}
              className="w-full py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Retour à mon Profil
            </button>

            {user && user.id && user.id !== 'guest' && (
              <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1 pt-1">
                <Info className="w-3 h-3" />
                Connecté en tant que {user.email || user.name}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};