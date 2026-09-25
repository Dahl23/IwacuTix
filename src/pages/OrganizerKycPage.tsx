import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api } from '../services/apiClient';
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
  Phone
} from 'lucide-react';

export const OrganizerKycPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useApp();

  // Liste des demandes récupérées depuis GET /api/organisateurs/demandes/mes/
  const [demandes, setDemandes] = useState<DemandeOrganisateur[]>([]);
  const [loadingDemandes, setLoadingDemandes] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form states
  const [nomLegal, setNomLegal] = useState(user.name || '');
  const [structureName, setStructureName] = useState(user.organisateurProfile?.nom_structure || '');
  const [justification, setJustification] = useState('');
  const [identityPhotoUrl, setIdentityPhotoUrl] = useState<string>('');
  const [identityPhotoFile, setIdentityPhotoFile] = useState<File | null>(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les demandes de l'utilisateur au montage (GET /api/organisateurs/demandes/mes/)
  const fetchMesDemandes = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await api.organisateurs.getMesDemandes();
      if (res && Array.isArray(res)) {
        setDemandes(res);
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
  }, []);

  const handleIdentityPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdentityPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setIdentityPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Soumission directe de la demande (POST /api/organisateurs/demandes/) sans vérification email
  const handleSubmitDemande = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nomLegal.trim()) {
      setErrorMsg('Veuillez renseigner votre nom complet légal.');
      return;
    }

    if (!identityPhotoFile) {
      setErrorMsg('Veuillez téléverser la photo de votre pièce d\'identité.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        nom_entreprise: structureName.trim() || nomLegal.trim(),
        nom_structure: structureName.trim() || undefined,
        justification: justification.trim() || `Demande d'adhésion organisateur IwacuTix - ${nomLegal.trim()}`,
        document_verification: identityPhotoFile,
      };

      // POST /api/organisateurs/demandes/
      const createdDemande = await api.organisateurs.soumettreDemande(payload);

      // Récupération immédiate de la liste mise à jour via GET /api/organisateurs/demandes/mes/
      await fetchMesDemandes();

      if (createdDemande) {
        setDemandes((prev) => [createdDemande, ...prev.filter((d) => d.id !== createdDemande.id)]);
      }

      setShowNewForm(false);
      setIdentityPhotoFile(null);
      setIdentityPhotoUrl('');
    } catch (err) {
      const { message } = parseApiError(err);
      setErrorMsg(message || 'Impossible de soumettre la demande. Vérifiez que votre téléphone est renseigné et réessayez.');
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
          <p className="text-[10px] text-slate-500 font-mono">Vérification d'identité & Approbation SuperAdmin</p>
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
        {/* Rappel des conditions d'éligibilité */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300/40 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Conditions de validation d'adhésion</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/90 leading-relaxed">
            <li>Numéro de téléphone vérifié sur votre compte client.</li>
            <li>Dossier d'identité complet avec pièce justificative officielle.</li>
            <li>
              <strong>Aucune vérification d'e-mail requise</strong> : la demande est soumise directement à l'examen du SuperAdmin.
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
                Votre demande a été approuvée par l'équipe IwacuTix. Vous pouvez créer des événements, gérer vos billetteries et assigner vos scanneurs.
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
                <span className="text-slate-500">Téléphone du compte :</span>
                <span className="font-mono font-medium text-slate-800">{derniereDemande.telephone || user.phone}</span>
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
                  <span className="text-slate-500">Document joint :</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-brand-primary font-bold">
                    <FileText className="w-3.5 h-3.5" />
                    Pièce d'identité transmise
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed text-center">
              Votre dossier complet a passé le contrôle automatique. Il est actuellement entre les mains de l'administrateur de la plateforme pour validation finale.
            </p>

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

        {/* 3. DERNIÈRE DEMANDE REJETÉE (AVEC POSSIBILITÉ DE RE-SOUMETTRE) */}
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
                {derniereDemande.motif_rejet || 'Le dossier transmis ne remplit pas tous les critères requis (téléphone non vérifié ou document illisible).'}
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

        {/* 4. FORMULAIRE DE SOUMISSION DIRECTE (SANS VÉRIFICATION EMAIL) */}
        {(!isApproved && !hasActivePending && (!derniereDemande || showNewForm || (derniereDemande.statut !== 'REJETE' && derniereDemande.statut !== 'REJETE_AUTO'))) && (
          <form onSubmit={handleSubmitDemande} className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-base font-display font-extrabold text-slate-900">
                Dossier d'adhésion organisateur
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Renseignez les informations de votre structure et joignez une pièce d'identité officielle. Votre demande sera soumise directement pour examen par le SuperAdmin.
              </p>
            </div>

            <div className="space-y-3 pt-2">
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
                  Nom de l'organisation ou structure événementielle <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={structureName}
                    onChange={(e) => setStructureName(e.target.value)}
                    placeholder="Ex: Buja Horizon Events ou Vital'O FC"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400">Ce nom apparaîtra publiquement sur vos billets et événements.</span>
              </div>

              {/* Téléphone de contact */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Numéro de téléphone vérifié
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={user.phone || 'Non renseigné'}
                    readOnly
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-medium text-slate-700 focus:outline-none cursor-not-allowed"
                  />
                </div>
                {!user.phone && (
                  <span className="text-[10px] text-red-500 font-medium">
                    Attention : un numéro de téléphone vérifié sur votre compte est obligatoire pour le contrôle automatique.
                  </span>
                )}
              </div>

              {/* Justification / Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Présentation de vos activités (Optionnel)
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Décrivez brièvement les types d'événements que vous organisez (concerts, conférences, sports...)"
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none resize-none"
                />
              </div>

              {/* Photo de la pièce d'identité */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Photo de la pièce d'identité</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Obligatoire</span>
                </div>
                {identityPhotoUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-900">
                    <img src={identityPhotoUrl} alt="Pièce d'identité" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-[10px] font-bold bg-black/60 px-2 py-1 rounded">Photo chargée</span>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-400 gap-1 aspect-video">
                    <UploadCloud className="w-6 h-6" />
                    <span className="text-[10px]">Photo ou scan de votre pièce d'identité</span>
                  </div>
                )}
                <label
                  className="w-full py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <UploadCloud className="w-3 h-3 text-slate-500" />
                  Sélectionner le document
                  <input type="file" accept="image/*,application/pdf" onChange={handleIdentityPhotoUpload} className="sr-only" />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all mt-4 cursor-pointer"
            >
              <span>{isSubmitting ? 'Soumission du dossier...' : 'Soumettre ma demande Organisateur'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
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
