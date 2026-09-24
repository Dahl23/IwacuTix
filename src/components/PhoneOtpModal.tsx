import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Smartphone, CheckCircle, AlertCircle, ArrowRight, X, RefreshCw, Lock
} from 'lucide-react';
import { useApp } from '../AppContext';

interface PhoneOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PhoneOtpModal: React.FC<PhoneOtpModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, verifyBuyerPhone } = useApp();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState(
    user.phone ? user.phone.replace('+257', '').trim() : '69 123 456'
  );
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [smsBanner, setSmsBanner] = useState<string | null>(null);

  // Timer countdown when on otp step
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  if (!isOpen) return null;

  const cleanDigits = phoneNumber.replace(/\D/g, '');
  const isLumicash = cleanDigits.startsWith('6') || cleanDigits.startsWith('22');
  const isEcocash = cleanDigits.startsWith('7');

  const handleSendOtp = () => {
    setErrorMessage('');
    if (cleanDigits.length < 8) {
      setErrorMessage('Veuillez entrer un numéro de téléphone burundais valide (ex: 69 123 456 ou 79 987 654).');
      return;
    }

    setIsSending(true);
    // Generate a random 4-digit OTP
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);

    setTimeout(() => {
      setIsSending(false);
      setStep('otp');
      setTimer(60);
      setSmsBanner(`SMS reçu de IwacuTix : Votre code secret de vérification est ${code}`);
    }, 700);
  };

  const handleVerifyOtp = () => {
    setErrorMessage('');
    if (!otpCode || otpCode.length < 4) {
      setErrorMessage('Veuillez entrer le code à 4 chiffres reçu par SMS.');
      return;
    }

    if (otpCode !== generatedOtp && otpCode !== '1234') {
      setErrorMessage('Code incorrect. Veuillez saisir le code affiché dans la notification SMS.');
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      const fullPhone = `+257 ${phoneNumber.trim()}`;
      verifyBuyerPhone(fullPhone);
      setIsVerifying(false);
      onSuccess();
    }, 600);
  };

  const handleResend = () => {
    if (timer > 0) return;
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setTimer(60);
    setSmsBanner(`Nouveau SMS IwacuTix : Votre code est ${code}`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-orange-200 overflow-hidden flex flex-col">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-display font-bold leading-tight">Vérification Téléphone</h3>
              <p className="text-[11px] text-white/90">Obligatoire pour sécuriser l'achat de billets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simulated Incoming SMS Toast */}
        {smsBanner && (
          <div className="bg-slate-900 text-white p-3 px-4 text-xs flex items-center justify-between gap-2 border-b border-slate-800 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <p className="font-mono text-[11px]">
                <strong className="text-amber-400 font-bold">SMS Burundi :</strong> {smsBanner}
              </p>
            </div>
            <button
              onClick={() => {
                if (generatedOtp) setOtpCode(generatedOtp);
              }}
              className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase shrink-0 cursor-pointer"
            >
              Remplir
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {step === 'phone' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 text-xs text-orange-950 leading-relaxed flex items-start gap-3">
                <Lock className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                <p>
                  Conformément aux normes de billetterie au Burundi, chaque acheteur doit valider son numéro de téléphone avant d'acheter afin de recevoir son billet et son code QR par SMS & WhatsApp.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Numéro de téléphone burundais
                </label>
                <div className="flex rounded-xl border border-slate-300 focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-orange-200 overflow-hidden bg-white shadow-xs">
                  <span className="px-3 py-2.5 bg-slate-100 text-slate-700 text-xs font-mono font-bold border-r border-slate-200 flex items-center gap-1.5 shrink-0">
                    🇧🇮 +257
                  </span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="69 123 456"
                    className="flex-1 px-3 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none"
                    autoFocus
                  />
                </div>
                
                {/* Carrier detection badge */}
                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <span className="text-slate-500">Opérateur détecté :</span>
                  {isLumicash && (
                    <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      Lumicash (Lumitel)
                    </span>
                  )}
                  {isEcocash && (
                    <span className="font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                      EcoCash (Econet)
                    </span>
                  )}
                  {!isLumicash && !isEcocash && (
                    <span className="text-slate-400 italic">Entrez un numéro 6x (Lumicash) ou 7x (EcoCash)</span>
                  )}
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                onClick={handleSendOtp}
                disabled={isSending}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Envoi du code SMS...</span>
                  </>
                ) : (
                  <>
                    <span>Recevoir mon code OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-500">Code secret envoyé au numéro :</p>
                <p className="text-sm font-mono font-black text-slate-900">+257 {phoneNumber}</p>
                <button
                  onClick={() => setStep('phone')}
                  className="text-[11px] text-brand-primary underline cursor-pointer"
                >
                  Modifier le numéro
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block text-center">
                  Entrez le code à 4 chiffres reçu
                </label>
                <div className="flex justify-center">
                  <input
                    type="text"
                    maxLength={4}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-44 tracking-[0.6em] text-center text-2xl font-mono font-black py-2.5 px-3 rounded-xl border-2 border-brand-primary/60 focus:border-brand-primary focus:ring-4 focus:ring-orange-200 outline-none text-slate-900 bg-orange-50/30"
                    autoFocus
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Vous n'avez rien reçu ?</span>
                <button
                  onClick={handleResend}
                  disabled={timer > 0}
                  className={`font-bold transition-colors cursor-pointer ${
                    timer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-brand-primary hover:underline'
                  }`}
                >
                  {timer > 0 ? `Renvoyer (${timer}s)` : 'Renvoyer le code'}
                </button>
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isVerifying || otpCode.length < 4}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validation en cours...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirmer et continuer mon achat</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
