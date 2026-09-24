import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
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
  ArrowUpRight 
} from 'lucide-react';

export const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user, 
    parametrePlateforme, 
    updateParametrePlateforme, 
    organisateursKyc, 
    updateOrganisateurKyc, 
    versements,
    events,
    tickets
  } = useApp();

  const [delaiJours, setDelaiJours] = useState(parametrePlateforme.delai_versement_jours);
  const [commissionTaux, setCommissionTaux] = useState(parametrePlateforme.commission_taux_defaut);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveParams = (e: React.FormEvent) => {
    e.preventDefault();
    updateParametrePlateforme(delaiJours, commissionTaux);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Compute platform global stats
  const totalVolumeFbu = tickets.reduce((sum, t) => sum + t.price, 0);
  const totalCommissionsFbu = Math.round(totalVolumeFbu * (parametrePlateforme.commission_taux_defaut / 100));

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
              +145 200 Sats Lightning ⚡
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Commissions Collectées ({parametrePlateforme.commission_taux_defaut}%)
            </span>
            <div className="text-base font-display font-bold text-brand-primary">
              {totalCommissionsFbu.toLocaleString('fr-FR')} FBu
            </div>
            <span className="text-[10px] text-slate-500 block">
              Prélevées à la source
            </span>
          </div>
        </div>

        {/* 1. Platform Parameters (Section 5 du cahier des charges) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-purple-600" />
              Configuration Globale (ParametrePlateforme)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Dernière modif : {parametrePlateforme.date_modification}
            </span>
          </div>

          <form onSubmit={handleSaveParams} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                  Délai de versement (Jours)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={delaiJours}
                    onChange={(e) => setDelaiJours(Number(e.target.value))}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-mono text-slate-400">
                    jours
                  </span>
                </div>
                <p className="text-[9px] text-slate-400">
                  Par défaut 7 jours (reversement automatique hebdomadaire le Dimanche).
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                  Commission par défaut (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={commissionTaux}
                    onChange={(e) => setCommissionTaux(Number(e.target.value))}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-mono text-slate-400">
                    %
                  </span>
                </div>
                <p className="text-[9px] text-slate-400">
                  Retenue automatiquement sur les flux Lumicash & Lightning.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {savedSuccess ? (
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
              {organisateursKyc.length} compte(s)
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {organisateursKyc.map((org) => (
              <div key={org.id} className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{org.nom_structure}</h4>
                    <p className="text-[10px] text-slate-500">
                      Resp: {org.responsable} • {org.telephone} • {org.email}
                    </p>
                  </div>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    org.statut_verification === 'VERIFIE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : org.statut_verification === 'EN_ATTENTE'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {org.statut_verification}
                  </span>
                </div>

                <div className="text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg space-y-0.5">
                  <div className="text-slate-400 uppercase text-[9px]">Canaux de reversement configurés :</div>
                  {org.moyens.map((m, i) => (
                    <div key={i} className="text-slate-700 font-semibold">• {m}</div>
                  ))}
                </div>

                {org.statut_verification === 'EN_ATTENTE' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => updateOrganisateurKyc(org.id, 'VERIFIE')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approuver le KYC
                    </button>
                    <button
                      onClick={() => updateOrganisateurKyc(org.id, 'REJETE')}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Rejeter
                    </button>
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
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Journal des Versements Automatiques (Section 6.E)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Hebdomadaire
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {versements.map((vst) => (
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
