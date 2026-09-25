import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api, API_BASE_URL } from '../services/apiClient';
import { toAbsoluteApiUrl } from '../services/apiMappers';
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
  ExternalLink
} from 'lucide-react';

export const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [auditLogs, setAuditLogs] = useState<TransactionAuditLog[] | null>(null);

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
        const d = await api.admin.getDemandesOrganisateurs();
        if (d && d.results) setApiDemandes(d.results);
      } catch {}
      await loadHistorique();
    })();
  }, []);

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
  const handleDecideDemande = async (id: string, decision: 'APPROUVE' | 'REJETE') => {
    const motif = decision === 'REJETE'
      ? (window.prompt('Motif du rejet (affiché à l\'organisateur) :', 'Documents non conformes') || '')
        .trim()
      : undefined;
    try {
      await api.admin.deciderDemandeOrganisateur(id, { statut: decision, motif_rejet: motif });
      const d = await api.admin.getDemandesOrganisateurs();
      if (d && d.results) setApiDemandes(d.results);
    } catch {
      alert('Décision non enregistrée : backend indisponible. Réessayez dans quelques secondes.');
    }
  };

  // Mapping d'une demande API vers l'affichage du panneau SuperAdmin
  const mapStatutVerification = (statut: DemandeOrganisateur['statut']): string => {
    if (statut === 'APPROUVE') return 'VERIFIE';
    if (statut === 'REJETE_AUTO') return 'REJETE AUTO';
    if (statut === 'REJETE') return 'REJETE';
    return 'EN_ATTENTE';
  };

  const displayOrgs = apiDemandes !== null
    ? apiDemandes.map((d) => ({
        id: d.id,
        nom_structure: d.nom_entreprise || d.nom_structure || 'Dossier organisateur',
        responsable: d.nom_soumis,
        telephone: d.telephone,
        email: '',
        statut_verification: mapStatutVerification(d.statut),
        justification: d.justification || null,
        documentVerification: d.document_verification || null,
        motif_rejet: d.motif_rejet || null,
      }))
    : organisateursKyc.map((o) => ({
        id: o.id,
        nom_structure: o.nom_structure,
        responsable: o.responsable,
        telephone: o.telephone,
        email: o.email,
        statut_verification: o.statut_verification,
        justification: null,
        documentVerification: null,
        motif_rejet: null,
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

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
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

        {/* 1. Platform Parameters (Section 5 du cahier des charges) */}
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

        {/* 2. KYC Validation of Organizers (Section 3) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-600" />
              Dossiers KYC Organisateurs
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {displayOrgs.length} compte(s)
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {displayOrgs.map((org) => (
              <div key={org.id} className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{org.nom_structure}</h4>
                    <p className="text-[10px] text-slate-500">
                      Resp: {org.responsable || 'Non spécifié'} • {org.telephone ? `Tél: ${org.telephone}` : 'Tél: Non renseigné (optionnel)'}{org.email ? ` • ${org.email}` : ''}
                    </p>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
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

                <div className="text-[10px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg space-y-1">
                  <div className="text-slate-400 uppercase text-[9px] font-bold">Dossier d'adhésion :</div>
                  {org.justification ? (
                    <div className="text-slate-700 font-semibold">Justification : {org.justification}</div>
                  ) : (
                    <div className="text-slate-700 font-semibold">Demande d'adhésion transmise (CNI Recto & Verso).</div>
                  )}
                  {org.documentVerification && (
                    <div className="pt-1">
                      <a
                        href={toAbsoluteApiUrl(org.documentVerification, API_BASE_URL)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-brand-primary text-[10px] font-bold hover:bg-orange-50 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Consulter la CNI (Recto & Verso)</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </div>
                  )}
                  {org.motif_rejet && (
                    <div className="text-red-600 font-semibold">Motif de rejet : {org.motif_rejet}</div>
                  )}
                </div>

                {(org.statut_verification === 'EN_ATTENTE' || org.statut_verification === 'REJETE AUTO') && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => void handleDecideDemande(org.id, 'APPROUVE')}
                      disabled={org.statut_verification === 'REJETE AUTO'}
                      title={org.statut_verification === 'REJETE AUTO' ? 'Rejetée automatiquement — plus aucune décision possible' : undefined}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approuver le KYC
                    </button>
                    <button
                      onClick={() => void handleDecideDemande(org.id, 'REJETE')}
                      disabled={org.statut_verification === 'REJETE AUTO'}
                      title={org.statut_verification === 'REJETE AUTO' ? 'Rejetée automatiquement — plus aucune décision possible' : undefined}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-200"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Rejeter
                    </button>
                    {org.statut_verification === 'REJETE AUTO' && (
                      <span className="text-[10px] text-violet-700 italic font-semibold">
                        Rejet automatique déjà acté — cette demande ne peut plus être approuvée (demande_rejetee_auto).
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 3. Automatic Payouts Journal (Section 6.E) */}
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
      </div>
    </div>
  );
};
