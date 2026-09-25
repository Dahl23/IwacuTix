import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api } from '../services/apiClient';
import { parseApiError } from '../utils/apiErrors';
import { 
  ShieldCheck, 
  UploadCloud, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  FileText, 
  Building2, 
  User as UserIcon, 
  ChevronLeft,
  Clock,
  Info
} from 'lucide-react';

export const OrganizerKycPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [nomLegal, setNomLegal] = useState(user.name || '');
  const [structureName, setStructureName] = useState(user.organisateurProfile?.nom_structure || '');
  const [numeroCni, setNumeroCni] = useState('');
  const [cniRectoUrl, setCniRectoUrl] = useState<string>('');
  const [cniVersoUrl, setCniVersoUrl] = useState<string>('');
  const [cniRectoFile, setCniRectoFile] = useState<File | null>(null);
  const [cniVersoFile, setCniVersoFile] = useState<File | null>(null);

  
  // Email & OTP states
  const [email, setEmail] = useState(user.email && user.email !== 'contact@iwacutix.bi' ? user.email : '');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleCniRectoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCniRectoFile(file);
    const reader = new FileReader();
    reader.onload = () => setCniRectoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCniVersoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCniVersoFile(file);
    const reader = new FileReader();
    reader.onload = () => setCniVersoUrl(reader.result as string);
    reader.readAsDataURL(file);
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

  const handleSaveEmail = async () => {
    setErrorMsg('');
    if (!email.trim()) {
      setErrorMsg('Veuillez renseigner une adresse email valide.');
      return;
    }
    setIsSubmitting(true);
    try {
      const profil = await api.organisateurs.updateMonProfil({ email: email.trim() });
      if (profil && profil.email) setEmail(profil.email);
      setErrorMsg('');
    } catch (err) {
      const { message } = parseApiError(err);
      setErrorMsg(message || 'Impossible de mettre à jour l\'adresse email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendEmailOtp = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await api.organisateurs.demanderVerificationEmailOrganisateur();
      setEmailOtpSent(true);
      setEmailOtpCode('');
    } catch (err) {
      const { message, code: apiCode } = parseApiError(err);
      if (apiCode === 'email_absent') {
        setErrorMsg('Aucune adresse email sur votre profil organisateur. Ajoutez une adresse email valide ci-dessus puis re-tentez l\'envoi.');
      } else if (apiCode === 'tentatives_epuisees') {
        setErrorMsg('Trop de demandes récentes. Veuillez réessayer dans quelques minutes.');
      } else {
        setErrorMsg(message || 'Impossible d\'envoyer le code de vérification. Réessayez.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtpCode.trim()) {
      setErrorMsg('Veuillez saisir le code à 6 chiffres reçu par email.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await api.organisateurs.confirmerVerificationEmailOrganisateur(emailOtpCode.trim());
      updateUserProfile({
        email_verifie: true,
        ...(res.profil && res.profil.email ? { email: res.profil.email } : {}),
        ...(res.profil && res.profil.nom_entreprise ? { organisateurProfile: { ...user.organisateurProfile, nom_structure: res.profil.nom_entreprise } } : {}),
      });
      setIsEmailVerified(true);
      setStep(3);
    } catch (err) {
      const { message, code: apiCode } = parseApiError(err);
      if (apiCode === 'code_expire') {
        setErrorMsg(message || 'Ce code a expiré (validité 10 minutes). Demandez un nouveau code.');
        setEmailOtpSent(false);
      } else if (apiCode === 'code_invalide') {
        setErrorMsg(message || 'Code invalide. Vérifiez le code reçu par email.');
      } else if (apiCode === 'tentatives_epuisees') {
        setErrorMsg('Trop de tentatives échouées. Demandez un nouveau code plus tard.');
        setEmailOtpSent(false);
      } else {
        setErrorMsg(message || 'Impossible de valider le code. Réessayez.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalActivation = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const file = cniRectoFile;
      if (!file) {
        setErrorMsg('Veuillez sélectionner la photo recto de votre CNI avant de soumettre.');
        setIsSubmitting(false);
        return;
      }
      const demande = await api.organisateurs.soumettreDemande({
        nom_entreprise: structureName.trim() || nomLegal.trim(),
        nom_structure: structureName.trim() || undefined,
        justification: `Demande d'adhésion organisateur IwacuTix - ${nomLegal.trim()} - CNI ${numeroCni.trim()}`,
        document_verification: file,
      });

      if (demande && (demande.statut === 'REJETE_AUTO' || demande.statut === 'REJETE')) {
        setErrorMsg(demande.motif_rejet || 'Votre demande a été rejetée. Vérifiez vos documents (CNI illisible) et soumettez une nouvelle demande.');
        setStep(1);
        return;
      }

      // Demande acceptée en file d'attente de contrôle → écran « en attente de validation »
      setSubmitted(true);
    } catch (err) {
      const { message } = parseApiError(err);
      setErrorMsg(message || 'Demande non soumise : backend momentanément indisponible. Réessayez dans quelques secondes.');
    } finally {
      setIsSubmitting(false);
    }
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
                  <label
                    className="w-full py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <UploadCloud className="w-3 h-3 text-slate-500" />
                    Sélectionner la photo Recto
                    <input type="file" accept="image/*" onChange={handleCniRectoUpload} className="sr-only" />
                  </label>
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
                  <label
                    className="w-full py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <UploadCloud className="w-3 h-3 text-slate-500" />
                    Sélectionner la photo Verso
                    <input type="file" accept="image/*" onChange={handleCniVersoUpload} className="sr-only" />
                  </label>
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
                Un code de vérification à 6 chiffres (valable 10 minutes) sera envoyé à l'adresse email de votre profil organisateur pour authentifier les notifications et rapports de billetterie.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adresse Email du profil <span className="text-red-500">*</span>
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
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSaveEmail()}
                    disabled={isSubmitting}
                    className="px-3 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isSubmitting ? '...' : 'Enregistrer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSendEmailOtp()}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Envoi...' : emailOtpSent ? 'Renvoyer le code' : 'Envoyer le code'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Enregistrez d'abord votre email si le profil n'en contient pas, puis envoyez le code.
                </p>
              </div>

              {emailOtpSent && (
                <div className="p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Code de vérification reçu par Email</span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                      6 chiffres • 10 min
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={emailOtpCode}
                      onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="flex-1 py-2.5 px-4 text-center font-mono font-bold tracking-widest text-lg rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-brand-primary outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleVerifyEmailOtp()}
                      disabled={isSubmitting || emailOtpCode.length < 6}
                      className="px-5 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Validation...' : 'Valider le code'}
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

        {/* STEP 3: EMAIL VERIFIED → SUBMIT DEMANDE / SENT */}
        {step === 3 && !submitted && (
          <div className="space-y-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <Mail className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-display font-extrabold text-slate-900">
                Vérification de votre email réussie !
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Votre email organisateur est vérifié. Vous pouvez maintenant soumettre votre demande d'adhésion afin que l'équipe IwacuTix valide vos documents (CNI).
              </p>
            </div>

            {/* Demande summary */}
            <div className="text-left bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Récapitulatif de la demande
              </span>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Structure / Nom légal</span>
                <span className="font-bold text-slate-900">{structureName.trim() || nomLegal.trim()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">CNI</span>
                <span className="font-bold text-slate-900 font-mono">{numeroCni.trim()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Email vérifié</span>
                <span className="font-bold text-emerald-700">{email.trim() || user.email || '-'}</span>
              </div>
            </div>

            <button
              id="btn-activate-organizer-profile"
              onClick={() => void handleFinalActivation()}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-60 disabled:cursor-wait text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <span>{isSubmitting ? 'Soumission de votre demande...' : 'Soumettre ma demande Organisateur'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 3b: DEMANDE SOUMISE — EN ATTENTE DE VALIDATION */}
        {step === 3 && submitted && (
          <div className="space-y-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-display font-extrabold text-slate-900">
                Demande soumise — en attente de validation
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Votre demande d'adhésion organisateur (<strong className="text-slate-700">{structureName.trim() || nomLegal.trim()}</strong>) est en cours d'examen par l'équipe IwacuTix. Vous serez notifié dès qu'elle sera approuvée.
              </p>
            </div>

            <button
              onClick={() => navigate('/organisateur')}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              Retour à l'Espace Organisateur
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
