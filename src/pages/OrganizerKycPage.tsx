import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { 
  ShieldCheck, 
  UploadCloud, 
  Mail, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  FileText, 
  Building2, 
  User as UserIcon, 
  Lock, 
  ChevronLeft,
  Sparkles,
  QrCode,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';

export const OrganizerKycPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, submitOrganizerKyc } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [nomLegal, setNomLegal] = useState(user.name || '');
  const [structureName, setStructureName] = useState(user.organisateurProfile?.nom_structure || '');
  const [numeroCni, setNumeroCni] = useState('');
  const [cniRectoUrl, setCniRectoUrl] = useState<string>('https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80');
  const [cniVersoUrl, setCniVersoUrl] = useState<string>('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80');
  
  // Email & OTP states
  const [email, setEmail] = useState(user.email || '');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sample quick load for smooth demo
  const handleLoadDemoCni = () => {
    setNomLegal(user.name || 'Dahl Ndayisenga');
    setStructureName('Buja Horizon Events');
    setNumeroCni('CNI-257-98140-BJM');
    setCniRectoUrl('https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80');
    setCniVersoUrl('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80');
    setEmail(user.email || 'dahlndayisenga0@gmail.com');
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!nomLegal.trim()) {
      setErrorMsg('Veuillez renseigner votre nom complet légal.');
      return;
    }
    if (!numeroCni.trim()) {
      setErrorMsg('Veuillez renseigner le numéro officiel de votre CNI.');
      return;
    }
    if (!cniRectoUrl || !cniVersoUrl) {
      setErrorMsg('Veuillez téléverser la face RECTO et VERSO de votre CNI.');
      return;
    }
    setStep(2);
  };

  const handleSendEmailOtp = () => {
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Veuillez entrer une adresse email valide.');
      return;
    }
    setErrorMsg('');
    setEmailOtpSent(true);
    setEmailOtpCode('4821'); // Simulated code
  };

  const handleVerifyEmailOtp = () => {
    if (emailOtpCode === '4821' || emailOtpCode.length === 4) {
      setIsEmailVerified(true);
      setErrorMsg('');
      setStep(3);
    } else {
      setErrorMsg('Code OTP email invalide. (Astuce démo : 4821)');
    }
  };

  const handleFinalActivation = () => {
    submitOrganizerKyc({
      nomLegal: nomLegal.trim(),
      numeroCni: numeroCni.trim(),
      email: email.trim(),
      cniRectoUrl,
      cniVersoUrl,
      structureName: structureName.trim() || nomLegal.trim()
    });

    navigate('/organisateur');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC] overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200/80 sticky top-0 z-20 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-display font-extrabold text-slate-900">Vérification Organisateur</h1>
          <p className="text-[10px] text-slate-500 font-mono">Conformité légale & Billetterie certifiée</p>
        </div>
        <button
          type="button"
          onClick={handleLoadDemoCni}
          className="text-[10px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
          title="Pré-remplir automatiquement pour tester"
        >
          Démo CNI
        </button>
      </div>

      <div className="p-4 sm:p-6 max-w-xl mx-auto w-full space-y-5 pb-12">
        {/* Step Indicator */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 z-0" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-brand-primary z-0 transition-all duration-300"
              style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
            />

            {/* Step 1 */}
            <div className={`relative z-10 flex flex-col items-center gap-1 ${step >= 1 ? 'text-brand-primary' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                step > 1 ? 'bg-brand-primary text-white border-brand-primary' : step === 1 ? 'bg-orange-50 text-brand-primary border-brand-primary' : 'bg-white text-slate-400 border-slate-200'
              }`}>
                {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-[10px] font-bold">CNI (2 faces)</span>
            </div>

            {/* Step 2 */}
            <div className={`relative z-10 flex flex-col items-center gap-1 ${step >= 2 ? 'text-brand-primary' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                step > 2 ? 'bg-brand-primary text-white border-brand-primary' : step === 2 ? 'bg-orange-50 text-brand-primary border-brand-primary' : 'bg-white text-slate-400 border-slate-200'
              }`}>
                {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
              </div>
              <span className="text-[10px] font-bold">Email & OTP</span>
            </div>

            {/* Step 3 */}
            <div className={`relative z-10 flex flex-col items-center gap-1 ${step === 3 ? 'text-brand-primary' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                step === 3 ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-slate-400 border-slate-200'
              }`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold">Activation</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: CNI RECTO / VERSO */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-base font-display font-extrabold text-slate-900">
                1. Pièce d'Identité Officielle (CNI)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Conformément aux normes de billetterie au Burundi, l'organisateur doit justifier de son identité par sa Carte Nationale d'Identité en recto et verso.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom complet du responsable légal <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={nomLegal}
                    onChange={(e) => setNomLegal(e.target.value)}
                    placeholder="Ex: Dahl Ndayisenga"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom de l'organisation ou structure événementielle
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={structureName}
                    onChange={(e) => setStructureName(e.target.value)}
                    placeholder="Ex: Buja Horizon Events ou Vital'O FC"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">Si vous êtes indépendant, laissez vide (votre nom légal sera utilisé).</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Numéro de Carte Nationale d'Identité (CNI) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={numeroCni}
                    onChange={(e) => setNumeroCni(e.target.value)}
                    placeholder="Ex: CNI-257-89104-BJM"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                    required
                  />
                </div>
              </div>

              {/* Photos CNI Recto / Verso */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Recto */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">CNI Face RECTO</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Face avant</span>
                  </div>
                  {cniRectoUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-900">
                      <img src={cniRectoUrl} alt="CNI Recto" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white text-[10px] font-bold bg-black/60 px-2 py-1 rounded">Recto validé</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-400 gap-1 aspect-video">
                      <UploadCloud className="w-6 h-6" />
                      <span className="text-[10px]">Photo du Recto</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setCniRectoUrl('https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&auto=format&fit=crop&q=80')}
                    className="w-full py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Sélectionner la photo Recto
                  </button>
                </div>

                {/* Verso */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">CNI Face VERSO</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">Face arrière</span>
                  </div>
                  {cniVersoUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-900">
                      <img src={cniVersoUrl} alt="CNI Verso" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white text-[10px] font-bold bg-black/60 px-2 py-1 rounded">Verso validé</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-400 gap-1 aspect-video">
                      <UploadCloud className="w-6 h-6" />
                      <span className="text-[10px]">Photo du Verso</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setCniVersoUrl('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80')}
                    className="w-full py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Sélectionner la photo Verso
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all mt-4 cursor-pointer"
            >
              <span>Continuer vers la vérification Email</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: EMAIL VERIFICATION WITH OTP */}
        {step === 2 && (
          <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-base font-display font-extrabold text-slate-900">
                2. Vérification de votre Email Professionnel
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Un code de vérification à 4 chiffres sera envoyé à votre adresse pour authentifier les notifications et rapports de billetterie.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adresse Email <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre-email@domaine.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                      disabled={emailOtpSent}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  >
                    {emailOtpSent ? 'Renvoyer' : 'Envoyer OTP'}
                  </button>
                </div>
              </div>

              {emailOtpSent && (
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-950">Code OTP reçu par Email</span>
                    <span className="text-[10px] font-mono text-orange-700 font-bold bg-white px-2 py-0.5 rounded border border-orange-200">
                      Code démo : 4821
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={emailOtpCode}
                      onChange={(e) => setEmailOtpCode(e.target.value)}
                      placeholder="4821"
                      className="flex-1 py-2.5 px-4 text-center font-mono font-bold tracking-widest text-lg rounded-xl border border-orange-300 bg-white focus:ring-2 focus:ring-brand-primary outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyEmailOtp}
                      className="px-5 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors cursor-pointer shrink-0"
                    >
                      Valider l'OTP
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ← Modifier la CNI
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ACTIVATION & PRIVILEGES */}
        {step === 3 && (
          <div className="space-y-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-display font-extrabold text-slate-900">
                Vérification KYC Réussie avec Succès !
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Votre identité a été certifiée. Votre compte est désormais titulaire des pleins droits d'Organisateur sur la plateforme IwacuTix.
              </p>
            </div>

            {/* Privileges summary */}
            <div className="text-left bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Privilèges débloqués et rattachés à votre nom
              </span>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Publication d'Événements & Billets</h4>
                  <p className="text-[11px] text-slate-500">Créez vos événements avec catégories de billets, prix en FBu et encaissement Lumicash ou Lightning / Blink.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Gestion des Statistiques en Direct</h4>
                  <p className="text-[11px] text-slate-500">Visualisez et gérez exclusivement les statistiques des événements rattachés à votre nom.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Création des Scanneurs de Billets</h4>
                  <p className="text-[11px] text-slate-500">Habilitez votre personnel de sécurité pour scanner et composter les tickets à l'entrée.</p>
                </div>
              </div>
            </div>

            {/* Final Action */}
            <button
              id="btn-activate-organizer-profile"
              onClick={handleFinalActivation}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <span>Accéder à mon Espace Organisateur</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
