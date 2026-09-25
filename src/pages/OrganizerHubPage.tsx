import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Event, TicketCategory, OrganisateurStats, ScanneurAssignment } from '../types';
import { api, API_BASE_URL } from '../services/apiClient';
import { toAbsoluteApiUrl } from '../services/apiMappers';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  PlusCircle, 
  QrCode, 
  ShieldCheck, 
  DollarSign, 
  UserCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  MapPin,
  ChevronRight,
  Sparkles,
  BarChart3,
  Search,
  UserPlus,
  Trash2
} from 'lucide-react';

export const OrganizerHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    user, 
    events, 
    tickets, 
    isUserVerified,
    openAuthModal
  } = useApp();

  const [activeTab, setActiveTab] = useState<'events' | 'scanners'>('events');

  // Scanner modal / quick add state
  const [targetEventId, setTargetEventId] = useState<string>('');
  const [scannerNom, setScannerNom] = useState('');
  const [scannerPhone, setScannerPhone] = useState('');
  const [scannerSuccessMsg, setScannerSuccessMsg] = useState('');
  const [scannerErrorMsg, setScannerErrorMsg] = useState('');

  // Data chargée depuis l'API organisateur (/api/organisateurs/...)
  const [apiEvents, setApiEvents] = useState<Event[] | null>(null);
  const [orgStats, setOrgStats] = useState<OrganisateurStats | null>(null);
  const [monProfilId, setMonProfilId] = useState<string | null>(null);
  const [monProfilStatus, setMonProfilStatus] = useState<'EN_ATTENTE' | 'VERIFIE' | 'REJETE' | undefined>(user.organisateurProfile?.statut_verification);
  const [apiScanners, setApiScanners] = useState<ScanneurAssignment[] | null>(null);

  const mapApiOrganizerEvent = (e: Record<string, any>): Event => {
    const tiers: TicketCategory[] = (e.tiers || []).map((tier: Record<string, any>) => ({
      id: tier.id,
      tierId: tier.id,
      name: tier.nom,
      price: Number.parseFloat(tier.prix_fbu || '0') || 0,
      available: tier.stock_disponible != null ? tier.stock_disponible : tier.stock_total || 0,
      stockTotal: tier.stock_total,
      moyens_paiement_acceptes: tier.moyens_paiement_acceptes,
    }));
    const catMap: Record<string, Event['category']> = { SPORT: 'sport', CONCERT: 'musique', RELIGIEUX: 'religion' };
    const rawDate = e.date_debut ? new Date(e.date_debut) : null;
    const validDate = rawDate && !Number.isNaN(rawDate.getTime()) ? rawDate : null;
    return {
      id: e.id,
      title: e.titre,
      description: e.description || '',
      category: catMap[e.categorie] || 'corporate',
      imageUrl: toAbsoluteApiUrl(e.affiche || e.image, API_BASE_URL) || '/gotix-logo.jpg',
      date: validDate
        ? validDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : 'Date à confirmer',
      time: validDate
        ? validDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : '--:--',
      location: [e.lieu, e.ville].filter(Boolean).join(', '),
      organisateur: e.organisateur || user.organisateurProfile?.nom_structure || user.name,
      organisateur_id: e.organisateur_id || user.id,
      ticketCategories: tiers,
      statut: e.statut || 'BROUILLON',
      visible_publiquement: e.visible_publiquement != null ? e.visible_publiquement : e.statut === 'PUBLIE',
    };
  };

  useEffect(() => {
    (async () => {
      try {
        const prof = await api.organisateurs.getMonProfil();
        setMonProfilId(prof.id);
        setMonProfilStatus(prof.statut_verification);
        try {
          const scans = await api.organisateurs.getScanneurs(prof.id);
          if (scans && scans.results) setApiScanners(scans.results);
        } catch {}
      } catch {}
      try {
        const res = await api.events.getMyEvents();
        if (res && res.results && res.results.length > 0) {
          setApiEvents(res.results.map(mapApiOrganizerEvent));
        }
      } catch {}
      try {
        const stats = await api.organisateurs.getStats();
        setOrgStats(stats);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1. Filter events STRICTLY ATTACHED to the organizer's name or ID
  const isAttachedToMe = (evt: Event) => {
    if (user.role === 'SUPERADMIN') return true;
    const matchId = evt.organisateur_id && evt.organisateur_id === user.id;
    const matchName = evt.organisateur && user.name && evt.organisateur.toLowerCase().trim() === user.name.toLowerCase().trim();
    const matchStructure = user.organisateurProfile?.nom_structure && evt.organisateur && 
      evt.organisateur.toLowerCase().trim() === user.organisateurProfile.nom_structure.toLowerCase().trim();
    return Boolean(matchId || matchName || matchStructure);
  };

  const myEvents = apiEvents !== null ? apiEvents : events.filter(isAttachedToMe);

  // 2. Filter tickets attached to my events only
  const myEventIds = new Set(myEvents.map(e => e.id));
  const myTickets = tickets.filter(t => myEventIds.has(t.eventId));

  // 3. Scanneurs assignés à mes événements (backend)
  const myScanners = apiScanners ?? [];
  const displayScanners = myScanners;
  const activeScannersCount = displayScanners.length;

  // 4. Compute statistics attached strictly to the organizer's events
  const totalRevenueFbu = myTickets.reduce((acc, t) => acc + t.price, 0);
  const totalTicketsSold = myTickets.length;
  const totalScannedTickets = myTickets.filter(t => t.status === 'utilise').length;

  const handleAddScanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setScannerErrorMsg('');
    setScannerSuccessMsg('');

    if (!targetEventId) {
      setScannerErrorMsg('Veuillez sélectionner un de vos événements.');
      return;
    }
    if (!scannerNom.trim()) {
      setScannerErrorMsg('Veuillez entrer le nom du scanneur.');
      return;
    }
    if (!scannerPhone.trim()) {
      setScannerErrorMsg('Veuillez entrer le numéro de téléphone du scanneur.');
      return;
    }

    if (monProfilId) {
      try {
        await api.organisateurs.assignerScanneur(monProfilId, {
          telephone_ou_user_id: scannerPhone.trim().replace(/^\+257\s*/, '+257').replace(/\s+/g, ''),
          event_id: targetEventId,
        });
        const scans = await api.organisateurs.getScanneurs(monProfilId);
        if (scans && scans.results) setApiScanners(scans.results);
        setScannerNom('');
        setScannerPhone('');
        setScannerSuccessMsg(`Scanneur « ${scannerNom.trim()} » habilité avec succès pour cet événement !`);
        setTimeout(() => setScannerSuccessMsg(''), 4000);
        return;
      } catch {
        setScannerErrorMsg('Habilitation échouée : backend indisponible. Réessayez dans quelques secondes.');
        return;
      }
    }
    setScannerErrorMsg('Profil organisateur non chargé. Réessayez.');
  };

  const handleRemoveScanner = async (assignmentId: string, scannerNom: string) => {
    if (!window.confirm(`Retirer « ${scannerNom} » de la liste des scanneurs habilités pour cet événement ? Ce retrait est définitif.`)) {
      return;
    }
    if (monProfilId) {
      try {
        await api.organisateurs.retirerScanneur(monProfilId, assignmentId);
        const scans = await api.organisateurs.getScanneurs(monProfilId);
        if (scans && scans.results) setApiScanners(scans.results);
      } catch {
        setScannerErrorMsg('Retrait échoué : backend indisponible. Réessayez dans quelques secondes.');
        return;
      }
    } else {
      setScannerErrorMsg('Profil organisateur non chargé. Réessayez.');
      return;
    }
    setScannerSuccessMsg(`Accès scanneur de « ${scannerNom} » retiré.`);
    setTimeout(() => setScannerSuccessMsg(''), 4000);
  };

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} FBu`;
  };

  // 0. If user has not created and verified their buyer account first
  if (!isUserVerified) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC]">
        <div className="w-16 h-16 rounded-3xl bg-orange-100 text-brand-primary flex items-center justify-center mb-4 shadow-md">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-display font-extrabold text-slate-900">Compte Acheteur Préalable Obligatoire</h2>
        <p className="text-xs text-slate-600 max-w-sm mt-2 leading-relaxed">
          Avant de soumettre votre dossier organisateur sur IwacuTix, vous devez d'abord créer votre compte acheteur (identifiant : email, téléphone ou pseudo + mot de passe).
        </p>
        <button
          onClick={() => openAuthModal('ORGANISATEUR')}
          className="mt-6 px-6 py-3 rounded-xl bg-brand-primary hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer active:scale-95 transition-all flex items-center gap-2"
        >
          <span>Créer & Vérifier mon compte maintenant</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // If not verified organizer, prompt to verify CNI
  if (user.role !== 'ORGANISATEUR' && user.role !== 'SUPERADMIN' && monProfilStatus !== 'VERIFIE') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F8FAFC]">
        <div className="w-16 h-16 rounded-3xl bg-orange-100 text-brand-primary flex items-center justify-center mb-4 shadow-md">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-display font-extrabold text-slate-900">Espace Organisateur Verrouillé</h2>
        <p className="text-xs text-slate-600 max-w-sm mt-2 leading-relaxed">
          Pour créer des événements, gérer vos statistiques de vente et nommer vos scanneurs de billets, vous devez vérifier votre identité légale (CNI recto/verso et Email).
        </p>
        <button
          onClick={() => navigate('/organisateur/verification')}
          className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer active:scale-95 transition-all"
        >
          Vérifier mon Identité (CNI + Email)
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC] overflow-y-auto">
      {/* Top Banner / Organizer Identity */}
      <div className="bg-slate-900 text-white px-4 py-5 sm:p-6 relative overflow-hidden border-b border-slate-800 shrink-0">
        <div className="absolute right-0 top-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Compte Organisateur Certifié CNI
              </span>
              {user.role === 'SUPERADMIN' && (
                <span className="px-2 py-0.5 rounded bg-purple-500/30 text-purple-300 text-[10px] font-mono font-bold">
                  SuperAdmin
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-white">
              {user.organisateurProfile?.nom_structure || user.name}
            </h1>
            <p className="text-xs text-slate-400">
              Responsable : <span className="text-white font-semibold">{user.name}</span> • Gestion exclusive des événements rattachés à votre nom
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link
              to="/organisateur/creer"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Créer un événement</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6 flex-1">
        {/* Statistics KPIs Grid (Calculated exclusively on myEvents) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* KPI 1 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-mono font-bold uppercase">Mes Événements</span>
              <Calendar className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="text-xl font-display font-extrabold text-slate-900">
              {orgStats ? orgStats.nb_evenements : myEvents.length}
            </div>
            <p className="text-[10px] text-slate-400">Rattachés à votre nom</p>
          </div>

          {/* KPI 2 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-mono font-bold uppercase">Billets Vendus</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-display font-extrabold text-slate-900">
              {orgStats ? orgStats.nb_billets_vendus : totalTicketsSold}
            </div>
            <p className="text-[10px] text-slate-400">Total sur vos événements</p>
          </div>

          {/* KPI 3 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-mono font-bold uppercase">Recettes Totales</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-base sm:text-lg font-mono font-extrabold text-emerald-600 truncate">
              {formatPrice(orgStats ? orgStats.total_fbu_affiche : totalRevenueFbu)}
            </div>
            <p className="text-[10px] text-slate-400">
              {orgStats && orgStats.total_sats > 0
                ? `${orgStats.total_sats.toLocaleString('fr-FR')} Sats ⚡`
                : 'Paiements encaissés'}
            </p>
          </div>

          {/* KPI 4 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-mono font-bold uppercase">Scanneurs Actifs</span>
              <QrCode className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-display font-extrabold text-slate-900">
              {activeScannersCount}
            </div>
            <p className="text-[10px] text-slate-400">Contrôle des entrées</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab('events')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'events'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Statistiques de mes Événements ({myEvents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('scanners')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'scanners'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Gestion de mes Scanneurs ({displayScanners.length})</span>
          </button>
        </div>

        {/* TAB 1: EVENTS & STATISTICS */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            {/* Détail des billets vendus par tarif (API stats organisateur) */}
            {orgStats && orgStats.par_tier && orgStats.par_tier.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    Billets vendus — détail par tarif
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{orgStats.nb_billets_vendus} billet(s)</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {orgStats.par_tier.map((row, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{row.tier__nom}</p>
                        <p className="text-[10px] text-slate-400 truncate">{row.event__titre}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono font-bold text-emerald-600">{row.nb_ventes} vendu(s)</p>
                        {row.total_sats > 0 && (
                          <p className="text-[10px] font-mono text-slate-400">{row.total_sats.toLocaleString('fr-FR')} Sats</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Récap ventes par événement */}
            {orgStats && orgStats.par_evenement && orgStats.par_evenement.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-brand-primary" />
                    Billets vendus — détail par événement
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {orgStats.par_evenement.map((row, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-slate-800 truncate">{row.event__titre}</p>
                      <p className="text-xs font-mono font-bold text-emerald-600 shrink-0">{row.nb_ventes} vendu(s)</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {myEvents.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-brand-primary flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Aucun événement rattaché à votre nom</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Vous n'avez pas encore publié d'événement sous le nom « {user.name} ». Publiez votre premier événement pour suivre ses ventes en temps réel !
                </p>
                <Link
                  to="/organisateur/creer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white font-bold text-xs uppercase tracking-wider shadow-md hover:bg-orange-700 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Créer mon premier événement</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myEvents.map((evt) => {
                  const eventTickets = tickets.filter(t => t.eventId === evt.id);
                  const eventRevenue = eventTickets.reduce((acc, t) => acc + t.price, 0);
                  const totalAvailable = evt.ticketCategories.reduce((acc, cat) => acc + cat.available, 0);
                  const fillRate = totalAvailable > 0 ? Math.round((eventTickets.length / (eventTickets.length + totalAvailable)) * 100) : 0;
                  const assignedScannersCount = displayScanners.filter(a => a.event_id === evt.id).length;

                  return (
                    <div
                      key={evt.id}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <img
                          src={evt.imageUrl}
                          alt={evt.title}
                          className="w-20 h-20 rounded-xl object-cover border border-slate-100 shrink-0 bg-slate-100"
                        />
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-mono font-bold text-[9px] uppercase">
                              {evt.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Rattaché à vous ({evt.organisateur})
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-display font-extrabold text-slate-900 truncate">
                            {evt.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {evt.date} à {evt.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {evt.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Event Stats summary */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 shrink-0 text-center text-xs">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-mono">Vendus</span>
                          <span className="font-bold text-slate-800">{eventTickets.length}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-mono">Recette</span>
                          <span className="font-mono font-bold text-emerald-600">{formatPrice(eventRevenue)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block font-mono">Scanneurs</span>
                          <span className="font-bold text-purple-700">{assignedScannersCount}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setTargetEventId(evt.id);
                            setActiveTab('scanners');
                          }}
                          className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Habiliter des agents scanneurs pour cet événement"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Scanneurs</span>
                        </button>
                        <button
                          onClick={() => navigate(`/organisateur/dashboard/${evt.id}`)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Statistiques complètes</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SCANNERS MANAGEMENT (Section 4 du cahier des charges) */}
        {activeTab === 'scanners' && (
          <div className="space-y-6">
            {/* Create Scanner Form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono font-bold text-[10px] uppercase">
                    Sécurité des Entrées
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-display font-extrabold text-slate-900">
                  Habiliter un Scanneur de billets (compte existant)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Le scanneur doit <strong className="text-slate-700">déjà posséder un compte IwacuTix</strong> (acheteur). Saisissez son numéro de téléphone enregistré : il se connectera avec son compte pour scanner vos billets QR code le jour J.
                </p>
              </div>

              {scannerSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{scannerSuccessMsg}</span>
                </div>
              )}
              {scannerErrorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{scannerErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleAddScanner} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Événement rattaché <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetEventId}
                    onChange={(e) => setTargetEventId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:ring-2 focus:ring-brand-primary outline-none"
                    required
                  >
                    <option value="">Sélectionnez un événement...</option>
                    {myEvents.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nom du compte <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={scannerNom}
                    onChange={(e) => setScannerNom(e.target.value)}
                    placeholder="Rechercher par nom"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-primary outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Téléphone du compte existant <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={scannerPhone}
                      onChange={(e) => setScannerPhone(e.target.value)}
                      placeholder="+257 79 123 456"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-primary outline-none"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shrink-0 cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Habiliter
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* List of scanners currently assigned to my events */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-display font-extrabold text-slate-900">
                    Scanneurs habilités sur vos événements
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ces personnes ont l'autorisation de vérifier et composter les tickets de vos événements.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-lg">
                  {displayScanners.length} actif{displayScanners.length > 1 ? 's' : ''}
                </span>
              </div>

              {displayScanners.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                  Aucun scanneur n'est encore habilité sur vos événements. Utilisez le formulaire ci-dessus pour habiliter un compte existant.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {displayScanners.map((scanner) => (
                    <div
                      key={scanner.id}
                      className="p-3.5 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-purple-100 text-purple-700">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{scanner.user_nom}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                              Actif
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>📞 {scanner.user_telephone}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">Événement : {scanner.event_titre}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => void handleRemoveScanner(scanner.id, scanner.user_nom)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Retirer l'accès scanneur (définitif)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
