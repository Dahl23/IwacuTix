import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { TicketPurchased } from '../types';
import { api } from '../services/apiClient';
import { MediaGalleryManager } from '../components/MediaGalleryManager';
import { 
  ChevronLeft, 
  TrendingUp, 
  Users, 
  DollarSign, 
  QrCode, 
  Sparkles, 
  Check, 
  Smartphone, 
  Printer, 
  ShoppingCart, 
  HelpCircle, 
  Megaphone,
  Wallet,
  Zap,
  ShieldCheck,
  UserPlus,
  Trash2,
  Calendar,
  Clock,
  ArrowRight
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    user,
    events, 
    tickets, 
    scanTicket, 
    publishOrganizerUpdate,
    portefeuille,
    parametrePlateforme,
    scanneurAssignments,
    assignScanneur,
    removeScanneurAssignment
  } = useApp();

  const event = events.find((evt) => evt.id === id);

  // Scanner staff assignment state
  const [newScannerName, setNewScannerName] = useState('');
  const [newScannerPhone, setNewScannerPhone] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);

  // Simulation states
  const [showScanner, setShowScanner] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Organizer announcement update state
  const [updateMessage, setUpdateMessage] = useState('');
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Stats réelles chargées depuis l'API (/api/organisateurs/...)
  const [apiLogsStats, setApiLogsStats] = useState<{ total: number; acceptes: number; rejetes: number } | null>(null);
  const [apiSales, setApiSales] = useState<{ nb_ventes: number; total_sats: number } | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const logs = await api.events.getLogsScan(id);
        setApiLogsStats(logs.stats);
      } catch {}
      try {
        const stats = await api.organisateurs.getStats();
        const perEvent = stats.par_evenement.find((e) => e.event__titre === event?.title);
        if (perEvent) setApiSales({ nb_ventes: perEvent.nb_ventes, total_sats: perEvent.total_sats });
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!event) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC] h-full">
        <HelpCircle className="w-12 h-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-display font-bold text-slate-900">Événement introuvable</h3>
        <p className="text-xs text-slate-500 mt-2">Ce tableau de bord nécessite un événement existant.</p>
        <button
          onClick={() => navigate('/home')}
          className="mt-6 px-6 py-2.5 bg-brand-primary rounded-xl text-white font-medium text-xs uppercase"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // Verification that the event is attached to this organizer's name/account
  const isOwner = user.role === 'SUPERADMIN' || 
    (Boolean(event.organisateur_id) && event.organisateur_id === user.id) ||
    (Boolean(event.organisateur) && Boolean(user.name) && event.organisateur.toLowerCase().trim() === user.name.toLowerCase().trim()) ||
    (Boolean(user.organisateurProfile?.nom_structure) && Boolean(event.organisateur) && event.organisateur.toLowerCase().trim() === user.organisateurProfile!.nom_structure.toLowerCase().trim());

  if (!isOwner && user.role === 'ORGANISATEUR') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC] h-full">
        <ShieldCheck className="w-12 h-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-display font-bold text-slate-900">Accès réservé au propriétaire de l'événement</h3>
        <p className="text-xs text-slate-500 mt-2 max-w-sm">
          Cet événement est rattaché à « <strong className="text-slate-800">{event.organisateur}</strong> ». Vous ne pouvez visualiser et gérer que les statistiques des événements rattachés à votre nom (<strong className="text-slate-800">{user.name}</strong>).
        </p>
        <button
          onClick={() => navigate('/organisateur')}
          className="mt-6 px-6 py-2.5 bg-brand-primary rounded-xl text-white font-medium text-xs uppercase cursor-pointer"
        >
          Voir mes événements
        </button>
      </div>
    );
  }

  const handlePublishUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateMessage.trim()) return;

    publishOrganizerUpdate(event.id, updateMessage.trim());
    setUpdateMessage('');
    setPublishSuccess(true);
    setTimeout(() => setPublishSuccess(false), 4000);
  };

  const handleAssignScanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScannerName.trim() || !newScannerPhone.trim()) return;

    assignScanneur(newScannerName.trim(), newScannerPhone.trim(), event.id);
    setNewScannerName('');
    setNewScannerPhone('');
    setAssignSuccess(true);
    setTimeout(() => setAssignSuccess(false), 3000);
  };

  // Filter tickets purchased for this specific event
  const eventTickets = tickets.filter((t) => t.eventId === id);

  // Scanners assigned to this event
  const eventScanners = scanneurAssignments.filter((a) => a.event_id === event.id && a.actif);

  // Scanned / Attended tickets (local)
  const totalScanned = eventTickets.filter((t) => t.status === 'utilise').length;

  // Compute stats (valeurs API prioritaires, repli local sinon)
  const totalRevenue = eventTickets.reduce((sum, t) => sum + t.price, 0);
  const totalTicketsSold = eventTickets.length;
  const displaySold = apiSales ? apiSales.nb_ventes : totalTicketsSold;
  const displayScanned = apiLogsStats ? apiLogsStats.acceptes : totalScanned;

  // Calculate potential capacities
  const totalCapacity = event.ticketCategories.reduce((sum, cat) => sum + cat.available, 0);
  const salesProgressPercent = totalCapacity > 0 ? Math.round((displaySold / totalCapacity) * 100) : 0;
  const attendancePercent = displaySold > 0 ? Math.round((displayScanned / displaySold) * 100) : 0;

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const codeToSearch = manualCode.trim().toUpperCase();
    const ticketToScan = eventTickets.find(t => t.id === codeToSearch || t.qrCodeValue === codeToSearch);

    if (ticketToScan) {
      if (ticketToScan.status === 'utilise') {
        setScanMessage({
          text: `Erreur: Le billet ${ticketToScan.id} a DÉJÀ été scanné !`,
          type: 'error'
        });
      } else {
        scanTicket(ticketToScan.id);
        setScanMessage({
          text: `Succès ! Billet ${ticketToScan.id} validé (${ticketToScan.recipientName || 'Titulaire'}). Accès AUTORISÉ.`,
          type: 'success'
        });
      }
    } else {
      setScanMessage({
        text: `Code '${codeToSearch}' invalide. Billet introuvable pour cet événement.`,
        type: 'error'
      });
    }

    setManualCode('');
    setTimeout(() => setScanMessage(null), 5000);
  };

  const triggerDirectScan = (ticketId: string) => {
    const t = eventTickets.find(ticket => ticket.id === ticketId);
    if (!t) return;
    
    if (t.status === 'utilise') {
      alert('Ce billet a déjà été scanné.');
      return;
    }

    scanTicket(ticketId);
    
    setScanMessage({
      text: `Scan réussi : Billet ${ticketId} de ${t.isGift ? t.recipientName : 'Titulaire'} validé !`,
      type: 'success'
    });
    setTimeout(() => setScanMessage(null), 3000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      
      {/* Header */}
      <div className="px-5 pt-4 pb-2 sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-slate-200/80 shadow-sm flex items-center justify-between">
        <button 
          onClick={() => navigate('/profil')} 
          className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center min-w-0 px-2">
          <h2 className="text-sm font-display font-bold text-slate-900 tracking-tight truncate">Tableau de Bord Organisateur</h2>
          <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider truncate">{event.title}</p>
        </div>
        <div className="w-9 h-9"></div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-24">
        
        {/* Organizer KYC & Structure Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <img 
              referrerPolicy="no-referrer"
              src={event.imageUrl} 
              alt={event.title} 
              className="w-12 h-12 object-cover rounded-xl border border-slate-100 shadow-sm shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100/50 uppercase">
                  {event.category}
                </span>
                <span className="text-[8px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Structure Vérifiée KYC
                </span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 truncate leading-tight mt-1">{event.title}</h3>
              <p className="text-[10px] text-slate-500 truncate">{event.location}</p>
            </div>
          </div>
        </div>

        {/* SECTION 5 & 6.E: DOUBLE PORTEFEUILLE ORGANISATEUR */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white rounded-2xl p-4 shadow-md space-y-3 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5 text-white">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Double Portefeuille Organisateur (Section 5)
            </span>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
              Maj: {portefeuille.derniere_maj}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* FBu Wallet */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
                Solde Mobile Money (FBu)
              </span>
              <div className="text-sm font-mono font-bold text-white">
                {portefeuille.solde_disponible_fbu.toLocaleString('fr-FR')} FBu
              </div>
              <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-mono">
                <Check className="w-3 h-3" />
                Vers +257 69 999 888 (Lumicash)
              </span>
            </div>

            {/* Lightning Sats Wallet */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
                Solde Lightning (Sats ⚡)
              </span>
              <div className="text-sm font-mono font-bold text-amber-400">
                {portefeuille.solde_disponible_sats.toLocaleString('fr-FR')} SATS
              </div>
              <span className="text-[9px] text-amber-300 flex items-center gap-1 font-mono">
                <Zap className="w-3 h-3 text-amber-400" />
                Vers vitalo@blink.sv (Blink)
              </span>
            </div>
          </div>

          {/* Reversement de la commission plateforme configurée (Section 8 ParametrePlateforme) */}
          <div className="p-2.5 rounded-xl bg-slate-850/80 border border-slate-700/60 text-[10px] text-slate-300 flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-snug">
              <span className="font-semibold text-white">
                Commission plateforme {Math.round((parseFloat(parametrePlateforme.commission_taux_defaut) || 0) * 100)}%
              </span>
              <p className="text-slate-400 text-[9.5px]">
                Canal {parametrePlateforme.canal_commission} • Vers {parametrePlateforme.destination_commission || 'destination configurée par l’administration'}.
              </p>
            </div>
          </div>
        </div>

        {/* GALERIE MÉDIAS DE L'ÉVÉNEMENT */}
        <MediaGalleryManager eventId={event.id} />

        {/* SECTION 4: GESTION DE L'ÉQUIPE DE SCANNEURS (ScanneurAssignment) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-600" />
              Équipe de Scanneurs Habilitée ({eventScanners.length})
            </span>
            <button
              onClick={() => navigate('/scan')}
              className="text-[10px] font-mono font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200"
            >
              Ouvrir le Scanner <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <p className="text-[10px] text-slate-500 leading-snug">
            Conformément à la Section 4 du cahier des charges, seuls les utilisateurs assignés ci-dessous peuvent valider les billets de cet événement.
          </p>

          {/* Assigned Scanners List */}
          <div className="space-y-2">
            {eventScanners.map((asg) => (
              <div 
                key={asg.id} 
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold text-slate-800 block truncate">{asg.user_nom}</span>
                  <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-slate-400" />
                    {asg.user_telephone} • {asg.date_assignation}
                  </span>
                </div>
                <button
                  onClick={() => removeScanneurAssignment(asg.id)}
                  title="Révoquer l'assignation"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Scanner Form */}
          <form onSubmit={handleAssignScanner} className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
              + Assigner un nouveau scanneur
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nom du scanneur (ex: Porte C)"
                value={newScannerName}
                onChange={(e) => setNewScannerName(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
              <input
                type="text"
                placeholder="Téléphone (+257 ...)"
                value={newScannerPhone}
                onChange={(e) => setNewScannerPhone(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              {assignSuccess && (
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Scanneur assigné avec succès !
                </span>
              )}
              <button
                type="submit"
                disabled={!newScannerName.trim() || !newScannerPhone.trim()}
                className="ml-auto px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <UserPlus className="w-3 h-3" />
                Créer l'assignation
              </button>
            </div>
          </form>
        </div>

        {/* Quick simulation alerts if any */}
        {scanMessage && (
          <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-fade-in text-xs font-bold leading-normal ${
            scanMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <Check className={`w-5 h-5 shrink-0 ${scanMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`} />
            <p>{scanMessage.text}</p>
          </div>
        )}

        {/* STATS BENTO GRID */}
        <div className="grid grid-cols-2 gap-3">
          {/* Revenue */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Chiffre d'Affaires</span>
              <div className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-mono font-bold text-slate-800">{formatPrice(totalRevenue)}</h4>
              <p className="text-[8.5px] text-emerald-600 font-bold flex items-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                {apiSales && apiSales.total_sats > 0
                  ? `${apiSales.total_sats.toLocaleString('fr-FR')} Sats ⚡`
                  : '100% encaissé'}
              </p>
            </div>
          </div>

          {/* Tickets Sold */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Billets Vendus</span>
              <div className="p-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-mono font-bold text-slate-800">
                {displaySold} <span className="text-[9px] text-slate-400 font-normal">/ {totalCapacity}</span>
              </h4>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div 
                  className="bg-brand-primary h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(salesProgressPercent, 100)}%` }}
                ></div>
              </div>
              <p className="text-[8px] text-slate-400 pt-0.5">{salesProgressPercent}% de la capacité</p>
            </div>
          </div>

          {/* Attendance / Scanned */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 shadow-sm col-span-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Taux de Présence (Scannés)</span>
                <span className="text-xs font-bold text-slate-500">Flux d'entrée en temps réel</span>
              </div>
              <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono font-bold">{displayScanned} scannés</span>
              </div>
            </div>
            
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-600">Entrées Validées</span>
                <span className="text-brand-primary">{attendancePercent}% ({displayScanned}/{displaySold || 0})</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(attendancePercent, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* PUBLISH ORGANIZER UPDATE CARD */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Megaphone className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Diffuser une mise à jour</h4>
              <p className="text-[10px] text-slate-500">Alerter instantanément les acheteurs et abonnés de cet événement</p>
            </div>
          </div>

          <form onSubmit={handlePublishUpdate} className="space-y-2">
            <textarea
              value={updateMessage}
              onChange={(e) => setUpdateMessage(e.target.value)}
              placeholder="Ex: L'accès commencera 1h plus tôt à cause de l'affluence. Préparez vos codes QR de billets !"
              rows={2}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-brand-primary focus:bg-white resize-none transition-colors placeholder-slate-400"
              maxLength={250}
            ></textarea>
            
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-400 font-mono">
                {250 - updateMessage.length} car. restants
              </span>
              <button
                type="submit"
                disabled={!updateMessage.trim()}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  updateMessage.trim()
                    ? 'bg-brand-primary hover:bg-indigo-700 text-white shadow-md'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                Envoyer l'Alerte 📢
              </button>
            </div>
          </form>

          {publishSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-bold text-emerald-800 flex items-center gap-2 animate-fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Annonce publiée avec succès ! Notification envoyée aux utilisateurs abonnés.</span>
            </div>
          )}
        </div>

        {/* CUSTOMER GUEST LIST & TICKET STATUSES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider font-semibold">
              BILLETS ÉMIS POUR CET ÉVÉNEMENT ({eventTickets.length})
            </h4>
            <span className="text-[9px] text-slate-500 font-mono">Temps réel</span>
          </div>

          {eventTickets.length === 0 ? (
            <div className="p-6 text-center bg-white border border-slate-200/80 rounded-2xl space-y-1">
              <p className="text-xs text-slate-500 font-bold">Aucun billet vendu pour le moment.</p>
              <p className="text-[10px] text-slate-400">
                Effectuez un achat au guichet pour enregistrer vos premiers billets.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {eventTickets.map((ticket) => (
                <div 
                  key={ticket.id} 
                  className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-2 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-indigo-600 select-all">{ticket.id}</span>
                        <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold border border-slate-200">
                          {ticket.categoryName}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-800">
                        {ticket.isGift ? ticket.recipientName : "Acheteur direct"}
                        {ticket.isGift && ticket.recipientHasNoPhone && (
                          <span className="ml-1 text-[8.5px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1 py-0.2 rounded">
                            Sans Téléphone
                          </span>
                        )}
                      </h5>
                    </div>

                    {/* Status Badge */}
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      ticket.status === 'utilise' 
                        ? 'bg-red-50 border-red-100 text-red-600' 
                        : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    }`}>
                      {ticket.status === 'utilise' ? 'SCANNÉ / ENTRÉ' : 'VALIDE'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-700">{ticket.paymentMethod} ({formatPrice(ticket.price)})</span>
                    </div>

                    {ticket.status === 'valide' ? (
                      <button
                        type="button"
                        onClick={() => triggerDirectScan(ticket.id)}
                        className="py-1 px-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-all text-[9.5px] cursor-pointer"
                      >
                        Valider Entrée
                      </button>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                        <Check className="w-3 h-3 text-slate-400 shrink-0" />
                        Accès Accordé
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

