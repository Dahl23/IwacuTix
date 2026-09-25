import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api, API_BASE_URL } from '../services/apiClient';
import { toAbsoluteApiUrl } from '../services/apiMappers';
import { parseApiError } from '../utils/apiErrors';
import { ParametrePlateforme, AdminStats, DemandeOrganisateur, TransactionAuditLog, Versement } from '../types';
import { 
  ChevronLeft, 
  ShieldCheck, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  Zap, 
  Building2, 
  Users, 
  TrendingUp, 
  Save, 
  ArrowUpRight,
  AlertTriangle,
  FileText,
  ExternalLink,
  LayoutDashboard,
  History,
  Inbox,
  Loader2,
  RefreshCw
} from 'lucide-react';

type AdminTab = 'overview' | 'requests' | 'settings' | 'history';
type DemandeFilter = 'EN_ATTENTE_SUPERADMIN' | 'APPROUVE' | 'REJETE' | 'REJETE_AUTO' | 'ALL';

const ADMIN_TABS: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Vue générale', icon: LayoutDashboard },
  { id: 'requests', label: 'Demandes', icon: Inbox },
  { id: 'settings', label: 'Réglages', icon: Settings },
  { id: 'history', label: 'Historique', icon: History },
];

const DEMANDE_FILTERS: { id: DemandeFilter; label: string }[] = [
  { id: 'EN_ATTENTE_SUPERADMIN', label: 'À traiter' },
  { id: 'ALL', label: 'Toutes' },
  { id: 'APPROUVE', label: 'Approuvées' },
  { id: 'REJETE', label: 'Rejetées' },
];

export const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    parametrePlateforme, 
    updateParametrePlateforme, 
    organisateursKyc, 
    versements,
    events,
    tickets
  } = useApp();

const [commissionTaux, setCommissionTaux] = useState(parametrePlateforme.commission_taux_defaut);
  const [canalCommission, setCanalCommission] = useState<ParametrePlateforme['canal_commission']>(parametrePlateforme.canal_commission);
  const [destinationCommission, setDestinationCommission] = useState(parametrePlateforme.destination_commission);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);

  // Données réelles /api/admin/...
  const [paramsData, setParamsData] = useState<ParametrePlateforme | null>(null);
  const [apiStats, setApiStats] = useState<AdminStats | null>(null);
  const [apiDemandes, setApiDemandes] = useState<DemandeOrganisateur[] | null>(null);
  const [demandesLoading, setDemandesLoading] = useState(true);
  const [demandesError, setDemandesError] = useState<string | null>(null);
  const [demandeFilter, setDemandeFilter] = useState<DemandeFilter>('EN_ATTENTE_SUPERADMIN');
  const [decisionPendingId, setDecisionPendingId] = useState<string | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);
  const [rejectingDemandeId, setRejectingDemandeId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [auditLogs, setAuditLogs] = useState<TransactionAuditLog[] | null>(null);

  const tabFromUrl = new URLSearchParams(location.search).get('tab');
  const [activeTab, setActiveTab] = useState<AdminTab>(
    tabFromUrl === 'requests' || tabFromUrl === 'settings' || tabFromUrl === 'history'
      ? tabFromUrl
      : 'overview'
  );

  // Filtres de l'historique d'audit exposés dans l'UI (GET /api/admin/historique/)
  const [histOrder, setHistOrder] = useState('');
  const [histTypeEvenement, setHistTypeEvenement] = useState('');
  const [histCanal, setHistCanal] = useState('');
  const [histReference, setHistReference] = useState('');

  const loadHistorique = async (params?: { order?: string; type_evenement?: string; canal?: string; reference_externe?: string }) => {
    try {
      const h = await api.admin.getHistorique(params);
      if (h && h.results) setAuditLogs(h.results);
    } catch {}
  };

  const loadDemandes = async (filter = demandeFilter, withSpinner = true) => {
    if (withSpinner) setDemandesLoading(true);
    setDemandesError(null);
    try {
      const response = await api.admin.getDemandesOrganisateurs(
        filter === 'ALL' ? undefined : { statut: filter }
      );
      setApiDemandes(response?.results ?? []);
    } catch (err) {
      const { message } = parseApiError(err);
      setApiDemandes([]);
      setDemandesError(message);
    } finally {
      if (withSpinner) setDemandesLoading(false);
    }
  };

  const selectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    navigate({
      pathname: '/admin/superadmin',
      search: tab === 'overview' ? '' : `?tab=${tab}`,
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const p = await api.admin.getParametresPlateforme();
        setParamsData(p);
        setCommissionTaux(p.commission_taux_defaut);
        setCanalCommission(p.canal_commission);
        setDestinationCommission(p.destination_commission);
      } catch {}
      try {
        const s = await api.admin.getStats();
        setApiStats(s);
      } catch {}
      try {
        await loadDemandes('EN_ATTENTE_SUPERADMIN');
      } catch {}
      await loadHistorique();
    })();
  }, []);

  useEffect(() => {
    if (tabFromUrl === 'requests' || tabFromUrl === 'settings' || tabFromUrl === 'history') {
      setActiveTab(tabFromUrl);
    } else {
      setActiveTab('overview');
    }
  }, [tabFromUrl]);

  const handleSaveParams = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedError(null);
    // PUT : remplacement complet de la ressource ParametrePlateforme (aucun champ omis)
    const payload: ParametrePlateforme = {
      ...(paramsData ?? parametrePlateforme),
      commission_taux_defaut: commissionTaux,
      canal_commission: canalCommission,
      destination_commission: destinationCommission,
    };
    try {
      const updated = await api.admin.updateParametrePlateforme(payload);
      setParamsData(updated);
      updateParametrePlateforme(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      setSavedError('Enregistrement échoué : backend indisponible. Aucune modification n\'a été appliquée.');
    }
  };

  // Décision SuperAdmin sur une demande d'adhésion organisateur
  const handleDecideDemande = async (
    id: string,
    decision: 'APPROUVE' | 'REJETE',
    motif?: string
  ) => {
    if (decision === 'REJETE' && !motif?.trim()) {
      return;
    }
    setDecisionPendingId(id);
    setDecisionFeedback(null);
    setDemandesError(null);
    try {
      const response = await api.admin.deciderDemandeOrganisateur(id, {
        statut: decision,
        motif_rejet: motif?.trim() || undefined,
      });
      const updatedDemande = response.demande;

      setApiDemandes((current) => {
        if (current === null) return current;
        const matchesCurrentFilter =
          demandeFilter === 'ALL' || updatedDemande.statut === demandeFilter;
        if (!matchesCurrentFilter) {
          return current.filter((demande) => demande.id !== id);
        }
        return current.map((demande) => demande.id === id ? updatedDemande : demande);
      });

      setRejectingDemandeId(null);
      setRejectionReason('');
      setDecisionFeedback(
        decision === 'APPROUVE'
          ? 'Demande approuvée. Le profil organisateur est maintenant actif.'
          : 'Demande rejetée et motif transmis au demandeur.'
      );

      // La mutation est déjà appliquée à l'écran. Un rafraîchissement discret aligne
      // ensuite le compteur et les éventuelles décisions prises par un autre administrateur.
      void loadDemandes(demandeFilter, false);
    } catch (err) {
      const { message } = parseApiError(err);
      setDemandesError(`Décision non enregistrée : ${message}`);
    } finally {
      setDecisionPendingId(null);
    }
  };

  // Mapping d'une demande API vers l'affichage du panneau SuperAdmin
  const mapStatutVerification = (statut: DemandeOrganisateur['statut']): string => {
    if (statut === 'APPROUVE') return 'VERIFIE';
    if (statut === 'REJETE_AUTO') return 'REJETE AUTO';
    if (statut === 'REJETE') return 'REJETE';
    return 'EN_ATTENTE';
  };

  const displayDemandes = (apiDemandes ?? []).map((d) => ({
        id: d.id,
        nom_structure: d.nom_entreprise || d.nom_structure || 'Dossier organisateur',
        responsable: d.nom_soumis,
        telephone: d.telephone,
        email: '',
        statut_verification: mapStatutVerification(d.statut),
        justification: d.justification || null,
        documentVerification: d.document_verification || null,
        documentRecto: d.document_recto || null,
        documentVerso: d.document_verso || null,
        statut: d.statut,
        motif_rejet: d.motif_rejet || null,
      }));

  // Journal : historique de transactions API en priorité, sinon versements simulés
  const journalEntries: Versement[] = auditLogs !== null && auditLogs.length > 0
    ? auditLogs.map((log) => ({
        id: String(log.id),
        organisateur_id: '',
        organisateur_nom: log.type_evenement || 'Transaction plateforme',
        canal: (log.canal === 'BITLIBERA' ? 'MOBILE_MONEY' : 'LIGHTNING') as Versement['canal'],
        montant_fbu: log.montant_fbu ? Number(log.montant_fbu) : undefined,
        montant_sats: log.montant_sats,
        destination: log.reference_externe || '-',
        statut: (log.statut === 'ECHEC' ? 'ECHEC' : log.statut === 'REUSSI' ? 'REUSSI' : 'EN_COURS') as Versement['statut'],
        reference_transaction: log.reference_externe || 'Non disponible',
        date_creation: log.date_creation ? new Date(log.date_creation).toLocaleDateString('fr-FR') : '-',
      }))
    : versements;

  // Compute platform global stats (commission_taux_defaut = fraction décimale, ex. "0.0200" = 2%)
  const commissionFraction = parseFloat(paramsData?.commission_taux_defaut ?? parametrePlateforme.commission_taux_defaut) || 0;
  const commissionPct = Math.round(commissionFraction * 1000) / 10;
  const totalVolumeFbu = apiStats ? apiStats.total_fbu_affiche : tickets.reduce((sum, t) => sum + t.price, 0);
  const totalCommissionsFbu = apiStats
    ? apiStats.total_commission_sats
    : Math.round(totalVolumeFbu * commissionFraction);

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      {/* Top Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display font-bold text-slate-900 text-sm">SuperAdmin IwacuTix HQ</h1>
            <p className="text-[10px] text-slate-500 font-mono">
              Supervision de la plateforme & ParametrePlateforme
            </p>
          </div>
        </div>

        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold border border-purple-200">
          SuperAdmin
        </span>
      </div>

      <nav
        aria-label="Navigation SuperAdmin"
        className="bg-white border-b border-slate-200 px-3 sm:px-4 overflow-x-auto"
      >
        <div className="flex min-w-max items-center gap-1 py-2">
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const pendingCount = tab.id === 'requests' && demandeFilter === 'EN_ATTENTE_SUPERADMIN'
              ? apiDemandes?.length
              : null;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {pendingCount !== null && pendingCount > 0 && (
                  <span className={`min-w-4 rounded-full px-1 text-[10px] leading-4 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <>
        {/* Platform Overview Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Volume Billets Émis
            </span>
            <div className="text-base font-display font-bold text-slate-900">
              {totalVolumeFbu.toLocaleString('fr-FR')} FBu
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block">
      {apiStats
                  ? `${apiStats.nb_billets_vendus} billets • ${apiStats.total_sats.toLocaleString('fr-FR')} Sats ⚡`
                  : 'En attente de synchronisation'}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Commissions Collectées ({commissionPct}%)
            </span>
            <div className="text-base font-display font-bold text-brand-primary">
              {apiStats
                ? `${totalCommissionsFbu.toLocaleString('fr-FR')} Sats ⚡`
                : `${totalCommissionsFbu.toLocaleString('fr-FR')} FBu`}
            </div>
            <span className="text-[10px] text-slate-500 block">
              {apiStats
                ? `${apiStats.total_net_organisateur_sats.toLocaleString('fr-FR')} Sats nets organisateurs`
                : 'En attente de synchronisation'}
            </span>
          </div>
        </div>

        {/* Règlements automatiques — alerte visible en cas d'échec définitif (GET /api/admin/stats/) */}
        {apiStats && (
          <div className={`rounded-xl border p-4 space-y-2.5 ${
            apiStats.reglements.organisateur_echecs_definitifs > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className={`w-4 h-4 ${apiStats.reglements.organisateur_echecs_definitifs > 0 ? 'text-red-600' : 'text-slate-400'}`} />
                Règlements Automatiques aux Organisateurs
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                <span className="text-[10px] text-slate-500 block">Commissions réussies</span>
                <span className="font-mono font-bold text-emerald-700">{apiStats.reglements.commission_reussis}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                <span className="text-[10px] text-slate-500 block">Règlements organisateurs réussis</span>
                <span className="font-mono font-bold text-emerald-700">{apiStats.reglements.organisateur_reussis}</span>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                <span className="text-[10px] text-slate-500 block">Échecs définitifs</span>
                <span className="font-mono font-bold text-red-700">{apiStats.reglements.organisateur_echecs_definitifs}</span>
              </div>
            </div>
            {apiStats.reglements.organisateur_echecs_definitifs > 0 && (
              <div className="p-3 rounded-xl bg-red-600 text-white text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>{apiStats.reglements.organisateur_echecs_definitifs} versement(s) organisateur en échec définitif.</strong>{' '}
                  Le reversement est bloqué : le destinataire ne récupérera pas ces fonds. Action requise (hors périmètre actuel des API exposées).
                </span>
              </div>
            )}
          </div>
        )}
          </>
        )}

        {activeTab === 'settings' && (
        /* 1. Platform Parameters (Section 5 du cahier des charges) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-purple-600" />
              Configuration Globale (ParametrePlateforme)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Dernière modif : {paramsData?.date_modification || parametrePlateforme.date_modification}
            </span>
          </div>

          <form onSubmit={handleSaveParams} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                  Commission par défaut (décimale)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={commissionTaux}
                    onChange={(e) => setCommissionTaux(e.target.value)}
                    placeholder="0.0200"
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-mono text-slate-400">
                    ex. 0.0200 = 2%
                  </span>
                </div>
                <p className="text-[9px] text-slate-400">
                  Retenue automatiquement sur les flux Mobile Money & Lightning.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                  Canal de la commission
                </label>
                <select
                  value={canalCommission}
                  onChange={(e) => setCanalCommission(e.target.value as ParametrePlateforme['canal_commission'])}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="LIGHTNING">Lightning (Bitcoin)</option>
                  <option value="LUMICASH">Lumicash</option>
                  <option value="MANUEL">Manuel</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                Destination de la commission
              </label>
              <input
                type="text"
                value={destinationCommission}
                onChange={(e) => setDestinationCommission(e.target.value)}
                placeholder="Adresse Lightning (ex. vitawallet@blink.sv) ou numéro MM"
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <p className="text-[9px] text-slate-400">
                Adresse ou numéro où créditer la commission plateforme à chaque encaissement.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              {savedError ? (
                <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {savedError}
                </span>
              ) : savedSuccess ? (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Paramètres sauvegardés avec succès !
                </span>
              ) : (
                <div />
              )}

              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Mettre à jour
              </button>
            </div>
          </form>
        </div>
        )}

        {activeTab === 'requests' && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden" aria-labelledby="demandes-title">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 id="demandes-title" className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  Demandes organisateur
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-500">Dossiers centralisés depuis l’API d’administration.</p>
              </div>
              <button
                type="button"
                onClick={() => void loadDemandes()}
                disabled={demandesLoading || decisionPendingId !== null}
                className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                title="Actualiser les demandes"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${demandesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 py-2">
              {DEMANDE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => {
                    setDemandeFilter(filter.id);
                    void loadDemandes(filter.id);
                  }}
                  className={`shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                    demandeFilter === filter.id
                      ? 'bg-purple-100 text-purple-800'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {decisionFeedback && (
              <div className="m-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{decisionFeedback}</span>
              </div>
            )}

            {demandesError && (
              <div className="m-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{demandesError}</span>
              </div>
            )}

            {demandesLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-12 text-xs font-semibold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des demandes...
              </div>
            ) : displayDemandes.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Inbox className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-2 text-xs font-bold text-slate-700">Aucune demande dans cette vue.</p>
                <p className="mt-1 text-[11px] text-slate-500">Les demandes reçues apparaîtront ici dès leur soumission.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {displayDemandes.map((org) => {
                  const documents = [
                    { label: 'Document principal', url: org.documentVerification },
                    { label: 'CNI recto', url: org.documentRecto },
                    { label: 'CNI verso', url: org.documentVerso },
                  ].filter((document): document is { label: string; url: string } => Boolean(document.url));
                  const canDecide = org.statut === 'EN_ATTENTE_SUPERADMIN';
                  const isPending = decisionPendingId === org.id;
                  const isRejecting = rejectingDemandeId === org.id;

                  return (
                    <article key={org.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 break-words">{org.nom_structure}</h3>
                          <p className="mt-0.5 text-[11px] text-slate-500 break-words">
                            {org.responsable || 'Responsable non renseigné'}{org.telephone ? ` · ${org.telephone}` : ''}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-mono px-2 py-1 rounded-full font-bold ${
                          org.statut_verification === 'VERIFIE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : org.statut_verification === 'REJETE AUTO'
                            ? 'bg-violet-100 text-violet-800'
                            : org.statut_verification === 'EN_ATTENTE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {org.statut_verification}
                        </span>
                      </div>

                      <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                        <p>{org.justification || 'Demande d’adhésion organisateur soumise.'}</p>
                        {documents.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {documents.map((document) => (
                              <a
                                key={`${org.id}-${document.label}`}
                                href={toAbsoluteApiUrl(document.url, API_BASE_URL)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-brand-primary hover:bg-orange-50"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                {document.label}
                                <ExternalLink className="h-3 w-3 text-slate-400" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] font-medium text-amber-700">Aucun document accessible dans la réponse API.</p>
                        )}
                        {org.motif_rejet && <p className="font-semibold text-red-700">Motif du rejet: {org.motif_rejet}</p>}
                      </div>

                      {canDecide && !isRejecting && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleDecideDemande(org.id, 'APPROUVE')}
                            disabled={isPending}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                          >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Approuver
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingDemandeId(org.id);
                              setRejectionReason('');
                              setDecisionFeedback(null);
                            }}
                            disabled={isPending}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-wait disabled:opacity-60"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Rejeter
                          </button>
                        </div>
                      )}

                      {isRejecting && (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            void handleDecideDemande(org.id, 'REJETE', rejectionReason);
                          }}
                          className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3"
                        >
                          <label className="block text-[11px] font-bold text-red-900" htmlFor={`motif-${org.id}`}>
                            Motif du rejet
                          </label>
                          <textarea
                            id={`motif-${org.id}`}
                            value={rejectionReason}
                            onChange={(event) => setRejectionReason(event.target.value)}
                            required
                            rows={3}
                            placeholder="Ex. document illisible ou incomplet."
                            className="w-full resize-y rounded-md border border-red-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-red-400"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="submit"
                              disabled={isPending || !rejectionReason.trim()}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-600 px-3 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              Confirmer le rejet
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => {
                                setRejectingDemandeId(null);
                                setRejectionReason('');
                              }}
                              className="h-8 rounded-md px-3 text-[11px] font-bold text-slate-600 hover:bg-white"
                            >
                              Annuler
                            </button>
                          </div>
                        </form>
                      )}

                      {org.statut === 'REJETE_AUTO' && (
                        <p className="text-[11px] font-semibold text-violet-700">Cette demande a été rejetée automatiquement et ne peut pas être approuvée.</p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'history' && (
        /* 3. Automatic Payouts Journal (Section 6.E) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
<span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Journal des Versements Automatiques (Section 6.E)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {auditLogs !== null && auditLogs.length > 0 ? `${journalEntries.length} entrée(s)` : 'Au fil des encaissements'}
            </span>
          </div>

          {/* Filtres de l'historique d'audit — exposés dans l'UI, transmis tels quels à GET /api/admin/historique/ */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void loadHistorique({
                order: histOrder.trim() || undefined,
                type_evenement: histTypeEvenement.trim() || undefined,
                canal: histCanal || undefined,
                reference_externe: histReference.trim() || undefined,
              });
            }}
            className="px-3.5 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-2"
          >
            <input
              type="text"
              value={histOrder}
              onChange={(e) => setHistOrder(e.target.value)}
              placeholder="order (ex. -date_creation)"
              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <input
              type="text"
              value={histTypeEvenement}
              onChange={(e) => setHistTypeEvenement(e.target.value)}
              placeholder="type_evenement"
              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <select
              value={histCanal}
              onChange={(e) => setHistCanal(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="">canal (tous)</option>
              <option value="BITLIBERA">BITLIBERA</option>
              <option value="BLINK">BLINK</option>
              <option value="MANUEL">MANUEL</option>
            </select>
            <input
              type="text"
              value={histReference}
              onChange={(e) => setHistReference(e.target.value)}
              placeholder="reference_externe"
              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <div className="flex gap-1.5">
              <button
                type="submit"
                className="flex-1 px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
              >
                Filtrer
              </button>
              <button
                type="button"
                onClick={() => {
                  setHistOrder('');
                  setHistTypeEvenement('');
                  setHistCanal('');
                  setHistReference('');
                  void loadHistorique();
                }}
                className="px-2 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
              >
                Réinitialiser
              </button>
            </div>
          </form>

          <div className="divide-y divide-slate-100">
            {journalEntries.map((vst) => (
              <div key={vst.id} className="p-3 text-xs flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">{vst.organisateur_nom}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      vst.statut === 'REUSSI' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {vst.statut}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Canal : {vst.canal} • Vers : {vst.destination}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    Réf : {vst.reference_transaction} • {vst.date_creation}
                  </p>
                </div>

                <div className="text-right">
                  {vst.montant_fbu ? (
                    <span className="font-bold text-slate-900 block font-mono">
                      {vst.montant_fbu.toLocaleString('fr-FR')} FBu
                    </span>
                  ) : (
                    <span className="font-bold text-amber-600 block font-mono">
                      {vst.montant_sats?.toLocaleString('fr-FR')} Sats ⚡
                    </span>
                  )}
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
