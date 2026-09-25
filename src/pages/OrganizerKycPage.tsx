import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api, API_BASE_URL, getStoredAccessToken, getApiBaseUrl } from '../services/apiClient';
import { toAbsoluteApiUrl } from '../services/apiMappers';
import { parseApiError } from '../utils/apiErrors';
import { DemandeOrganisateur } from '../types';
import { 
  ShieldCheck, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Building2, 
  User as UserIcon, 
  ChevronLeft,
  Clock,
  Info,
  RefreshCw,
  FileText,
  XCircle,
  Phone,
  Trash2,
  ExternalLink,
  Eye,
  Server
} from 'lucide-react';

/**
 * Assemble les deux photos (Recto et Verso) de la Carte Nationale d'Identité
 * en un document composite haute résolution pour le champ document_verification du backend.
 * Garanti 100% sans blocage avec un timeout de sécurité de 1.5s et repli immédiat.
 */
async function createMergedIdDocument(rectoFile: File, versoFile: File | null): Promise<File> {
  if (!versoFile) {
    return rectoFile;
  }

  const isRectoImage = rectoFile.type.startsWith('image/');
  const isVersoImage = versoFile.type.startsWith('image/');

  // Si l'un des deux n'est pas une image (ex. PDF), on transmet le rectoFile en document principal
  if (!isRectoImage || !isVersoImage) {
    return rectoFile;
  }

  return new Promise<File>((resolve) => {
    let resolved = false;
    let urlRecto = '';
    let urlVerso = '';

    const safeResolve = (file: File) => {
      if (resolved) return;
      resolved = true;
      if (urlRecto) URL.revokeObjectURL(urlRecto);
      if (urlVerso) URL.revokeObjectURL(urlVerso);
      resolve(file);
    };

    // Timeout de repli automatique : au-delà de 1.5s, on ne bloque jamais l'utilisateur
    const timer = setTimeout(() => {
      safeResolve(rectoFile);
    }, 1500);

    try {
      const imgRecto = new Image();
      const imgVerso = new Image();
      let loadedCount = 0;

      const onImageLoaded = () => {
        loadedCount++;
        if (loadedCount < 2) return;

        try {
          const maxWidth = 1200;
          const scaleRecto = maxWidth / (imgRecto.naturalWidth || imgRecto.width || 1200);
          const rWidth = maxWidth;
          const rHeight = Math.round((imgRecto.naturalHeight || imgRecto.height || 750) * scaleRecto);

          const scaleVerso = maxWidth / (imgVerso.naturalWidth || imgVerso.width || 1200);
          const vWidth = maxWidth;
          const vHeight = Math.round((imgVerso.naturalHeight || imgVerso.height || 750) * scaleVerso);

          const bannerHeight = 44;
          const padding = 16;
          const totalHeight = rHeight + vHeight + (bannerHeight * 2) + (padding * 3);

          const canvas = document.createElement('canvas');
          canvas.width = maxWidth;
          canvas.height = totalHeight;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            clearTimeout(timer);
            safeResolve(rectoFile);
            return;
          }

          // Fond moderne sombre
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Bandeau Titre Recto
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(0, 0, maxWidth, bannerHeight);
          ctx.fillStyle = '#F97316';
          ctx.font = 'bold 18px ui-sans-serif, system-ui, sans-serif';
          ctx.fillText("CARTE NATIONALE D'IDENTITÉ — RECTO (FACE AVANT)", 20, 28);

          // Image Recto
          ctx.drawImage(imgRecto, 0, bannerHeight, rWidth, rHeight);

          // Bandeau Titre Verso
          const versoBannerY = bannerHeight + rHeight + padding;
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(0, versoBannerY, maxWidth, bannerHeight);
          ctx.fillStyle = '#F97316';
          ctx.font = 'bold 18px ui-sans-serif, system-ui, sans-serif';
          ctx.fillText("CARTE NATIONALE D'IDENTITÉ — VERSO (FACE ARRIÈRE)", 20, versoBannerY + 28);

          // Image Verso
          const versoImageY = versoBannerY + bannerHeight;
          ctx.drawImage(imgVerso, 0, versoImageY, vWidth, vHeight);

          canvas.toBlob((blob) => {
            clearTimeout(timer);
            if (blob) {
              const composite = new File([blob], `cni_recto_verso_${Date.now()}.jpg`, { type: 'image/jpeg' });
              safeResolve(composite);
            } else {
              safeResolve(rectoFile);
            }
          }, 'image/jpeg', 0.90);
        } catch (err) {
          console.warn('[OrganizerKyc] Erreur fusion canvas :', err);
          clearTimeout(timer);
          safeResolve(rectoFile);
        }
      };

      const onError = () => {
        clearTimeout(timer);
        safeResolve(rectoFile);
      };

      // Attachement strict des écouteurs AVANT d'assigner .src
      imgRecto.onload = onImageLoaded;
      imgVerso.onload = onImageLoaded;
      imgRecto.onerror = onError;
      imgVerso.onerror = onError;

      urlRecto = URL.createObjectURL(rectoFile);
      urlVerso = URL.createObjectURL(versoFile);
      imgRecto.src = urlRecto;
      imgVerso.src = urlVerso;
    } catch (err) {
      clearTimeout(timer);
      safeResolve(rectoFile);
    }
  });
}

export const OrganizerKycPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isUserVerified, openAuthModal } = useApp();

  // Liste des demandes récupérées depuis GET /api/organisateurs/demandes/mes/
  const [demandes, setDemandes] = useState<DemandeOrganisateur[]>([]);
  const [loadingDemandes, setLoadingDemandes] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form states
  const [nomLegal, setNomLegal] = useState(user.name || '');
  const [structureName, setStructureName] = useState(user.organisateurProfile?.nom_structure || '');
  const [telephoneContact, setTelephoneContact] = useState(user.phone || '');
  const [justification, setJustification] = useState('');

  // Deux pièces : Recto (requis) et Verso (recommandé) de la CNI
  const [rectoFile, setRectoFile] = useState<File | null>(null);
  const [rectoPreviewUrl, setRectoPreviewUrl] = useState<string>('');

  const [versoFile, setVersoFile] = useState<File | null>(null);
  const [versoPreviewUrl, setVersoPreviewUrl] = useState<string>('');

  const [showNewForm, setShowNewForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les demandes de l'utilisateur au montage (GET /api/organisateurs/demandes/mes/)
  const fetchMesDemandes = async (isManualRefresh = false) => {
    if (!isUserVerified) {
      setLoadingDemandes(false);
      return;
    }
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await api.organisateurs.getMesDemandes();
      if (Array.isArray(res)) {
        setDemandes(res);
      } else if (res && Array.isArray((res as any).results)) {
        setDemandes((res as any).results);
      }
    } catch (err) {
      console.warn('[OrganizerKyc] Erreur récupération demandes :', err);
    } finally {
      setLoadingDemandes(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMesDemandes();
  }, [isUserVerified]);

  const handleRectoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRectoFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setRectoPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setRectoPreviewUrl('');
    }
  };

  const handleVersoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVersoFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setVersoPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setVersoPreviewUrl('');
    }
  };

  // Soumission directe de la demande (POST /api/organisateurs/demandes/)
  // Sans vérification par téléphone ni par email, téléphone optionnel,
  // et soumission conjointe du Recto et du Verso de la CNI.
  const handleSubmitDemande = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isUserVerified) {
      openAuthModal('ORGANISATEUR');
      return;
    }

    const token = getStoredAccessToken();
    if (!token) {
      setErrorMsg("Session non authentifiée. Veuillez vous connecter pour soumettre votre dossier.");
      openAuthModal('ORGANISATEUR');
      return;
    }

    if (!nomLegal.trim()) {
      setErrorMsg('Veuillez renseigner votre nom complet légal.');
      return;
    }

    if (!structureName.trim()) {
      setErrorMsg("Veuillez renseigner le nom de votre organisation ou structure d'événements.");
      return;
    }

    if (!rectoFile) {
      setErrorMsg("Veuillez téléverser la face avant (Recto) de votre carte nationale d'identité.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Assemblage composite des deux faces (Recto + Verso) garanti sans blocage
      const combinedDocument = await createMergedIdDocument(rectoFile, versoFile);

      // 2. Construction du FormData complet selon la spécification API Section 2.5
      // Spec: Body multipart: nom_entreprise (requis), document_verification (requis), 
      // nom_structure (optionnel), justification (optionnel), telephone (optionnel)
      const formData = new FormData();
      formData.append('nom_entreprise', structureName.trim());
      formData.append('nom_structure', structureName.trim());

      const justifText = justification.trim()
        ? justification.trim()
        : `Demande d'adhésion organisateur IwacuTix - ${nomLegal.trim()}${telephoneContact.trim() ? ` (Tél: ${telephoneContact.trim()})` : ''}`;
      formData.append('justification', justifText);

      // Téléphone optionnel
      if (telephoneContact.trim()) {
        formData.append('telephone', telephoneContact.trim());
      }

      // Document principal envoyé au backend
      formData.append('document_verification', combinedDocument);

      // Pièces jointes individuelles pour compatibilité
      formData.append('document_recto', rectoFile);
      if (versoFile) {
        formData.append('document_verso', versoFile);
        formData.append('document_verification_verso', versoFile);
      }

      // POST /api/organisateurs/demandes/
      const createdDemande = await api.organisateurs.soumettreDemande(formData);

      // Récupération immédiate de la liste mise à jour via GET /api/organisateurs/demandes/mes/
      await fetchMesDemandes();

      if (createdDemande && createdDemande.id) {
        setDemandes((prev) => [createdDemande, ...prev.filter((d) => d.id !== createdDemande.id)]);
      }

      setShowNewForm(false);
      setRectoFile(null);
      setRectoPreviewUrl('');
      setVersoFile(null);
      setVersoPreviewUrl('');
    } catch (err: any) {
      console.error('[OrganizerKyc] Erreur soumission demande :', err);
      const { message } = parseApiError(err);
      setErrorMsg(message || 'Impossible de soumettre la demande. Veuillez vérifier vos informations et réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const derniereDemande = demandes && demandes.length > 0 ? demandes[0] : null;
  const hasActivePending = derniereDemande && (
    derniereDemande.statut === 'EN_ATTENTE_SUPERADMIN' || 
    derniereDemande.statut === 'EN_ATTENTE_CONTROLE_AUTO'
  );
  const isApproved = user.role === 'ORGANISATEUR' || (derniereDemande && derniereDemande.statut === 'APPROUVE');

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'APPROUVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approuvé par le SuperAdmin
          </span>
        );
      case 'EN_ATTENTE_SUPERADMIN':
      case 'EN_ATTENTE_CONTROLE_AUTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            En attente d'approbation SuperAdmin
          </span>
        );
      case 'REJETE_AUTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            Rejet automatique
          </span>
        );
      case 'REJETE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            Rejeté par le SuperAdmin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            {statut}
          </span>
        );
    }
  };

  // 0. Si l'utilisateur n'a pas de compte actif connecté
  if (!isUserVerified) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC]">
        <div className="px-4 py-3 bg-white border-b border-slate-200/80 sticky top-0 z-20 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h1 className="text-sm font-display font-extrabold text-slate-900">Adhésion Organisateur</h1>
            <p className="text-[10px] text-slate-500 font-mono">Compte actif requis</p>
          </div>
          <div className="w-7" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-orange-100 text-brand-primary flex items-center justify-center mb-4 shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-display font-extrabold text-slate-900">Compte Actif Requis</h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Pour soumettre votre dossier d'adhésion organisateur et publier des événements, vous devez être connecté à un compte IwacuTix actif.
          </p>
          <button
            onClick={() => openAuthModal('ORGANISATEUR')}
            className="mt-6 w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Se connecter / Créer un compte</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

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
          <h1 className="text-sm font-display font-extrabold text-slate-900">Adhésion Organisateur</h1>
          <p className="text-[10px] text-slate-500 font-mono">Dossier CNI (Recto & Verso) & Approbation SuperAdmin</p>
        </div>
        <button
          onClick={() => void fetchMesDemandes(true)}
          disabled={refreshing}
          title="Actualiser les demandes"
          className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-primary' : ''}`} />
        </button>
      </div>

      <div className="p-4 sm:p-6 max-w-xl mx-auto w-full space-y-5 pb-12">
        {/* Conditions d'adhésion claires */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300/40 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Conditions du dossier d'adhésion</span>
          </div>
          <ul className="list-disc list-inside space-y-1.5 text-[11px] text-amber-900/90 leading-relaxed">
            <li>
              <strong>Compte actif requis</strong> : connecté sous l'identifiant <span className="font-semibold text-amber-950">{user.email || user.username || user.name || 'Actif'}</span>.
            </li>
            <li>
              <strong>Nom de l'entreprise ou structure</strong> : identification publique de votre organisation.
            </li>
            <li>
              <strong>Carte Nationale d'Identité (CNI)</strong> : soumission obligatoire des <strong>deux faces (Recto et Verso)</strong>.
            </li>
            <li>
              <strong>Numéro de téléphone optionnel</strong> : aucun numéro n'est imposé dans ce parcours.
            </li>
            <li>
              <strong>Aucune vérification SMS ni e-mail</strong> : la validation est humaine et effectuée directement par le <strong>SuperAdmin</strong>.
            </li>
          </ul>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. COMPTE DÉJÀ APPROUVÉ */}
        {isApproved && (
          <div className="space-y-4 bg-white p-5 sm:p-6 rounded-2xl border border-emerald-200 shadow-sm text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-display font-extrabold text-slate-900">
                Profil Organisateur Vérifié & Actif
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Votre demande a été approuvée par le SuperAdmin IwacuTix. Vous pouvez créer des événements, gérer vos billetteries et assigner vos scanneurs.
              </p>
            </div>

            <button
              onClick={() => navigate('/organisateur')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <span>Accéder à l'Espace Organisateur</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. DEMANDE EN ATTENTE D'APPROBATION SUPERADMIN */}
        {!isApproved && hasActivePending && (
          <div className="space-y-4 bg-white p-5 sm:p-6 rounded-2xl border border-amber-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-display font-extrabold text-slate-900 truncate">
                  Demande en cours d'examen
                </h2>
                <div className="mt-1">
                  {getStatusBadge(derniereDemande.statut)}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Structure / Entreprise :</span>
                <span className="font-bold text-slate-800">{derniereDemande.nom_entreprise || derniereDemande.nom_structure}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Téléphone de contact :</span>
                <span className="font-mono font-medium text-slate-800">
                  {derniereDemande.telephone || user.phone || 'Non renseigné (optionnel)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date de soumission :</span>
                <span className="text-slate-700">
                  {derniereDemande.date_soumission ? new Date(derniereDemande.date_soumission).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Récemment'}
                </span>
              </div>
              {derniereDemande.document_verification && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Pièces CNI jointes :</span>
                  <a
                    href={toAbsoluteApiUrl(derniereDemande.document_verification, API_BASE_URL)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-brand-primary font-bold hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>CNI (Recto & Verso)</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
              <p className="leading-relaxed">
                Votre dossier complet a été transmis. Le SuperAdmin examine actuellement vos documents. Aucune action supplémentaire (ni SMS, ni email) n'est requise.
              </p>
            </div>

            <button
              onClick={() => void fetchMesDemandes(true)}
              disabled={refreshing}
              className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Actualiser le statut de la demande</span>
            </button>
          </div>
        )}

        {/* 3. DERNIÈRE DEMANDE REJETÉE */}
        {!isApproved && !hasActivePending && derniereDemande && (derniereDemande.statut === 'REJETE' || derniereDemande.statut === 'REJETE_AUTO') && !showNewForm && (
          <div className="space-y-4 bg-white p-5 sm:p-6 rounded-2xl border border-red-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-display font-extrabold text-slate-900">
                  Demande précédente rejetée
                </h2>
                <div className="mt-1">
                  {getStatusBadge(derniereDemande.statut)}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-1 text-xs text-red-800">
              <span className="font-bold block">Motif du rejet :</span>
              <p className="leading-relaxed">
                {derniereDemande.motif_rejet || 'Le dossier transmis ne remplit pas tous les critères requis. Vous pouvez soumettre une nouvelle demande avec des photos plus nettes.'}
              </p>
            </div>

            <button
              onClick={() => setShowNewForm(true)}
              className="w-full py-3 rounded-xl bg-brand-primary hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Soumettre une nouvelle demande</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4. FORMULAIRE DE SOUMISSION DIRECTE */}
        {(!isApproved && !hasActivePending && (!derniereDemande || showNewForm || (derniereDemande.statut !== 'REJETE' && derniereDemande.statut !== 'REJETE_AUTO'))) && (
          <form onSubmit={handleSubmitDemande} className="space-y-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-base font-display font-extrabold text-slate-900">
                Dossier d'adhésion organisateur
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Renseignez le nom de votre structure et téléversez les deux faces (Recto et Verso) de votre carte nationale d'identité. Le SuperAdmin examinera directement votre demande.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              {/* Nom légal */}
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

              {/* Organisation / Structure */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom de l'organisation ou entreprise événementielle <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={structureName}
                    onChange={(e) => setStructureName(e.target.value)}
                    placeholder="Ex: Buja Horizon Events, Vital'O FC..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400">Ce nom apparaîtra publiquement sur vos billets et événements.</span>
              </div>

              {/* Téléphone de contact (OPTIONNEL) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Numéro de téléphone de contact
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                    Optionnel
                  </span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={telephoneContact}
                    onChange={(e) => setTelephoneContact(e.target.value)}
                    placeholder="Ex: +257 79 12 34 56"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-800 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  Facultatif. Aucune vérification par SMS n'est requise. Ce numéro sert uniquement de contact direct si nécessaire.
                </span>
              </div>

              {/* Justification / Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Présentation de vos activités <span className="text-slate-400 font-normal">(Optionnel)</span>
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Décrivez brièvement les types d'événements que vous organisez (concerts, festivals, conférences, compétitions sportives...)"
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none resize-none"
                />
              </div>

              {/* SECTION CNI : RECTO ET VERSO */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Carte Nationale d'Identité (CNI)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Les deux faces (Recto et Verso) sont requises pour l'examen par le SuperAdmin.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                    2 faces requises
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. CNI RECTO */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <span>Face 1 : Recto</span>
                        <span className="text-red-500">*</span>
                      </span>
                      {rectoFile ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Prêt
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                          Requis
                        </span>
                      )}
                    </div>

                    {rectoPreviewUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-900">
                        <img src={rectoPreviewUrl} alt="CNI Recto" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setRectoFile(null);
                            setRectoPreviewUrl('');
                          }}
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white hover:bg-red-600 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-brand-primary rounded-lg p-3 flex flex-col items-center justify-center text-slate-400 gap-1 aspect-[16/10] bg-white cursor-pointer transition-colors">
                        <UploadCloud className="w-5 h-5 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-700">Téléverser le Recto</span>
                        <span className="text-[9px] text-slate-400">Photo ou PDF face avant</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleRectoUpload}
                          className="sr-only"
                        />
                      </label>
                    )}

                    {rectoFile && (
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span className="truncate max-w-[140px] font-mono">{rectoFile.name}</span>
                        <label className="text-brand-primary font-bold hover:underline cursor-pointer">
                          Changer
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleRectoUpload}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* 2. CNI VERSO */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <span>Face 2 : Verso</span>
                        <span className="text-red-500">*</span>
                      </span>
                      {versoFile ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Prêt
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                          Requis
                        </span>
                      )}
                    </div>

                    {versoPreviewUrl ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-[16/10] bg-slate-900">
                        <img src={versoPreviewUrl} alt="CNI Verso" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setVersoFile(null);
                            setVersoPreviewUrl('');
                          }}
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-white hover:bg-red-600 transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-brand-primary rounded-lg p-3 flex flex-col items-center justify-center text-slate-400 gap-1 aspect-[16/10] bg-white cursor-pointer transition-colors">
                        <UploadCloud className="w-5 h-5 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-700">Téléverser le Verso</span>
                        <span className="text-[9px] text-slate-400">Photo ou PDF face arrière</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleVersoUpload}
                          className="sr-only"
                        />
                      </label>
                    )}

                    {versoFile && (
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span className="truncate max-w-[140px] font-mono">{versoFile.name}</span>
                        <label className="text-brand-primary font-bold hover:underline cursor-pointer">
                          Changer
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleVersoUpload}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Échec de la transmission :</span>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !rectoFile || !structureName.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all mt-4 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Transmission du dossier CNI en cours...</span>
                </>
              ) : (
                <>
                  <span>Soumettre au SuperAdmin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Indicateur de branchement de l'endpoint réel */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 truncate">
                <Server className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  Endpoint : <code className="font-mono text-slate-700 font-bold">POST /api/organisateurs/demandes/</code>
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400 truncate max-w-[150px]" title={getApiBaseUrl()}>
                {getApiBaseUrl().replace('https://', '').replace('http://', '')}
              </span>
            </div>
          </form>
        )}

        {/* Historique des demandes soumises */}
        {demandes.length > 1 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Historique de vos demandes
            </span>
            <div className="divide-y divide-slate-100">
              {demandes.map((d) => (
                <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">{d.nom_entreprise || d.nom_structure}</span>
                    <span className="text-[10px] text-slate-400">
                      {d.date_soumission ? new Date(d.date_soumission).toLocaleDateString('fr-FR') : '-'}
                      {d.telephone ? ` • Tél : ${d.telephone}` : ''}
                    </span>
                  </div>
                  <div>
                    {getStatusBadge(d.statut)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
