import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { api } from '../services/apiClient';
import { 
  ChevronLeft, 
  QrCode, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  History, 
  UserCheck, 
  Search, 
  HelpCircle,
  Sparkles,
  Ticket
} from 'lucide-react';

export const ScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user, 
    currentPersona, 
    events, 
    tickets, 
    scanneurAssignments, 
    scanTicketWithSecurity, 
    scanLogs 
  } = useApp();

  const [scanning, setScanning] = useState(false);
  const [apiScanLogs, setApiScanLogs] = useState<{
    id: string;
    ticket_id: string;
    statut_validation: 'ACCEPTE' | 'REJETE';
    tier_name?: string;
    raison_rejet?: string;
    scanned_at: string;
    scanned_by_nom: string;
  }[]>([]);

  // Find events where user is assigned or default to Vital'O FC
  const userAssignments = scanneurAssignments.filter(
    (a) => a.actif && (a.user_id === user.id || a.user_telephone === user.phone || user.role === 'ORGANISATEUR' || user.role === 'SUPERADMIN')
  );

  const defaultEventId = userAssignments[0]?.event_id || 'evt-vital-o-vs-le-messager';
  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId);
  const [inputCode, setInputCode] = useState('');
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    message: string;
    ticket?: any;
    reason?: string;
  } | null>(null);

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const isAssignedToSelectedEvent = scanneurAssignments.some(
    (a) => a.event_id === selectedEventId && a.actif && (a.user_id === user.id || a.user_telephone === user.phone)
  ) || user.role === 'ORGANISATEUR' || user.role === 'SUPERADMIN';

  // Journal des scans depuis /api/organisateurs/events/{id}/logs-scan/ (Section 3.D)
  useEffect(() => {
    if (!selectedEventId) return;
    let cancelled = false;
    api.events.getLogsScan(selectedEventId)
      .then((res) => {
        if (cancelled || !res || !res.results) return;
        setApiScanLogs(res.results.map((log) => ({
          id: log.id,
          ticket_id: log.billet_qr_code_hash,
          statut_validation: log.statut_validation,
          tier_name: log.billet_tiers_lib,
          raison_rejet: log.raison_rejet,
          scanned_at: new Date(log.scanned_at).toLocaleString('fr-FR'),
          scanned_by_nom: log.scanneur_nom || 'Organisateur',
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedEventId]);

  const handleScan = async (codeToScan?: string) => {
    const code = codeToScan || inputCode;
    if (!code.trim() || scanning) return;

    setScanning(true);
    try {
      // Validation côté backend : POST /api/tickets/valider/ { qr_code }
      const res = await api.tickets.valider(code.trim());
      if (res.statut === 'ACCEPTE') {
        setLastScanResult({
          success: true,
          message: 'Entrée autorisée',
          ticket: res.ticket
            ? {
                id: res.ticket.id,
                categoryName: res.ticket.tiers_lib,
                recipientName: res.ticket.destinataire_nom || 'Titulaire principal',
              }
            : undefined,
        });
      } else {
        setLastScanResult({
          success: false,
          message: res.error || 'Billet rejeté',
          reason:
            res.code === 'ticket_deja_scanne'
              ? 'Ce billet a déjà été validé à l\'entrée (tentative de double passage).'
              : res.code === 'ticket_invalide'
              ? 'Le code scanné ne correspond à aucun billet officiel IwacuTix.'
              : res.code === 'acces_interdit'
              ? 'Accès interdit : scanneur non habilité pour cet événement.'
              : undefined,
        });
      }
    } catch (err: any) {
      if (err instanceof TypeError) {
        // Backend injoignable → repli sur la validation locale (mode hors-ligne)
        const local = scanTicketWithSecurity(code.trim(), selectedEventId);
        setLastScanResult(local);
      } else {
        setLastScanResult({
          success: false,
          message: err?.error || 'Échec de la validation du billet',
          reason: err?.code === 'ticket_deja_scanne'
            ? 'Billet déjà scanné (fraude).'
            : err?.code === 'ticket_invalide'
            ? 'Billet invalide ou introuvable.'
            : undefined,
        });
      }
    } finally {
      setScanning(false);
      if (!codeToScan) setInputCode('');
    }
  };

  // Test ticket helpers
  const validPelouseTicket = tickets.find(
    (t) => t.eventId === selectedEventId && t.status === 'valide'
  );
  const usedTicket = tickets.find(
    (t) => t.eventId === selectedEventId && t.status === 'utilise'
  );
  const otherEventTicket = tickets.find(
    (t) => t.eventId !== selectedEventId
  );

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
            <h1 className="font-display font-bold text-slate-900 text-sm">Poste de Contrôle & Scan</h1>
            <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
              <UserCheck className="w-3 h-3 text-cyan-600" />
              Opérateur : {user.name}
            </p>
          </div>
        </div>

        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-semibold border border-cyan-200">
          Section 4 & 8
        </span>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Assignment Verification Alert Card */}
        <div className={`p-3.5 rounded-xl border ${
          isAssignedToSelectedEvent 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
            : 'bg-amber-50 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-start gap-2.5">
            {isAssignedToSelectedEvent ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  {isAssignedToSelectedEvent ? 'ScanneurAssignment Actif' : 'Assignation Manquante'}
                </span>
                <span className="text-[10px] font-mono opacity-75">
                  {isAssignedToSelectedEvent ? 'Autorisé ✅' : 'Refus ⛔'}
                </span>
              </div>
              <p className="text-[11px] opacity-85 mt-0.5 leading-snug">
                {isAssignedToSelectedEvent 
                  ? `Vous êtes habilité à contrôler les entrées pour "${selectedEvent?.title}". Tous les scans sont loggés avec votre ID.`
                  : `Attention : Selon la Section 4 du cahier des charges, vous n'avez pas de ScanneurAssignment pour cet événement. Les scans seront rejetés.`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Event Selector for multi-event environments */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
            Événement à contrôler
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              setLastScanResult(null);
            }}
            className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title} ({evt.date})
              </option>
            ))}
          </select>
        </div>

        {/* Scan Input & Scanner Viewport */}
        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5 text-white">
              <QrCode className="w-4 h-4 text-brand-primary" />
              Lecteur de Billets
            </span>
            <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
              Prêt à scanner
            </span>
          </div>

          {/* Scanner Simulation Target Box */}
          <div className="relative aspect-video rounded-xl bg-slate-950 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center p-3 text-center overflow-hidden">
            <div className="w-24 h-24 border-2 border-brand-primary/60 rounded-lg flex items-center justify-center relative">
              <div className="absolute inset-0 bg-brand-primary/10 animate-pulse rounded-lg" />
              <QrCode className="w-12 h-12 text-slate-500" />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-mono">
              Visez le QR code du billet ou saisissez son identifiant
            </p>
          </div>

          {/* Manual Code Input Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Ex: ITX-9812-A3..."
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-brand-primary"
              />
            </div>
            <button
              onClick={() => handleScan()}
              disabled={scanning}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold uppercase transition-colors shrink-0 disabled:opacity-60"
            >
              {scanning ? '…' : 'Valider'}
            </button>
          </div>
        </div>

        {/* Scan Result Feedback Banner */}
        {lastScanResult && (
          <div
            className={`p-4 rounded-xl border animate-in zoom-in-95 duration-150 ${
              lastScanResult.success
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : lastScanResult.reason?.includes('autre événement')
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {lastScanResult.success ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 shrink-0" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">
                    {lastScanResult.message}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/70 font-semibold">
                    {lastScanResult.success ? 'ACCEPTE' : 'REJETE'}
                  </span>
                </div>

                {lastScanResult.reason && (
                  <p className="text-xs font-medium text-red-800">
                    {lastScanResult.reason}
                  </p>
                )}

                {lastScanResult.ticket && (
                  <div className="mt-2 pt-2 border-t border-emerald-200/80 text-[11px] space-y-0.5 font-mono text-emerald-900">
                    <div>Billet ID : <strong>{lastScanResult.ticket.id}</strong></div>
                    <div>Catégorie : <strong>{lastScanResult.ticket.categoryName}</strong></div>
                    <div>Titulaire : <strong>{lastScanResult.ticket.recipientName || 'Titulaire principal'}</strong></div>
                    <div>Statut : <span className="font-bold text-emerald-700 uppercase">Utilisé à l'instant ✅</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Testing Presets according to specs */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Boutons de test rapide (Simulation)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-left text-xs">
            {validPelouseTicket && (
              <button
                onClick={() => handleScan(validPelouseTicket.id)}
                className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-left transition-colors"
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>1. Billet Valide (Pelouse)</span>
                  <span className="text-[9px] font-mono text-emerald-700">Test ✅</span>
                </div>
                <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                  ID: {validPelouseTicket.id}
                </div>
              </button>
            )}

            {usedTicket && (
              <button
                onClick={() => handleScan(usedTicket.id)}
                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-900 text-left transition-colors"
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>2. Billet Déjà Utilisé</span>
                  <span className="text-[9px] font-mono text-red-700">Fraude ❌</span>
                </div>
                <div className="text-[10px] text-red-700 font-mono mt-0.5">
                  ID: {usedTicket.id} (Doit être rejeté)
                </div>
              </button>
            )}

            {otherEventTicket && (
              <button
                onClick={() => handleScan(otherEventTicket.id)}
                className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-left transition-colors"
              >
                <div className="font-semibold flex items-center justify-between">
                  <span>3. Billet d'un Autre Événement</span>
                  <span className="text-[9px] font-mono text-amber-700">Refus ⛔</span>
                </div>
                <div className="text-[10px] text-amber-700 font-mono mt-0.5">
                  {otherEventTicket.eventTitle.slice(0, 24)}...
                </div>
              </button>
            )}

            <button
              onClick={() => handleScan('FAUX-CODE-INCONNU')}
              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-left transition-colors"
            >
              <div className="font-semibold flex items-center justify-between">
                <span>4. Code Falsifié / Inexistant</span>
                <span className="text-[9px] font-mono text-slate-500">Invalide ⚠️</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                FAUX-CODE-INCONNU
              </div>
            </button>
          </div>
        </div>

        {/* Scan Log History Table (Section 5) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              Journal des Scans en temps réel (ScanLog)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {scanLogs.length} entrée(s)
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {[...apiScanLogs, ...scanLogs].map((log) => (
              <div key={log.id} className="p-2.5 text-xs flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      log.statut_validation === 'ACCEPTE' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {log.statut_validation}
                    </span>
                    <span className="font-mono font-bold text-slate-900 truncate">
                      {log.ticket_id}
                    </span>
                    {log.tier_name && (
                      <span className="text-[10px] text-slate-500">
                        • {log.tier_name}
                      </span>
                    )}
                  </div>
                  {log.raison_rejet && (
                    <p className="text-[11px] text-red-600 font-medium">
                      {log.raison_rejet}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    Par {log.scanned_by_nom} • {log.scanned_at}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
