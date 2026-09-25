import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/apiClient';
import { useApp } from '../AppContext';
import { 
  Search, 
  UserCheck, 
  Smartphone, 
  X, 
  Users, 
  PlusCircle, 
  Loader2, 
  UserPlus,
  RefreshCw,
  QrCode,
  Shield,
  Briefcase
} from 'lucide-react';

export interface CandidateUser {
  id: string;
  name: string;
  phone: string;
  role?: string;
  badge?: string;
  category?: 'SCANNEURS' | 'ORGANISATEURS' | 'ACHETEURS' | 'AUTRE';
}

interface ScannerUserSelectorProps {
  organisateurId: string;
  selectedTarget: string; // phone or user_id
  selectedName: string;
  onSelect: (user: { target: string; name: string }) => void;
  onReset: () => void;
}

export const ScannerUserSelector: React.FC<ScannerUserSelectorProps> = ({
  organisateurId,
  selectedTarget,
  selectedName,
  onSelect,
  onReset,
}) => {
  const { user, tickets } = useApp();
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'TOUS' | 'SCANNEURS' | 'ACHETEURS' | 'ORGANISATEURS'>('TOUS');
  const [showFullEnum, setShowFullEnum] = useState(false);

  // Charger les utilisateurs réels depuis l'API backend et les données du système
  const loadUsersFromApi = async () => {
    setLoading(true);
    const userMap = new Map<string, CandidateUser>();

    // 1. Scanneurs déjà assignés sur le tenant de l'organisateur (GET /api/organisateurs/{id}/scanneurs/)
    if (organisateurId) {
      try {
        const res = await api.organisateurs.getScanneurs(organisateurId);
        if (res && res.results) {
          for (const s of res.results) {
            const key = s.telephone_scanneur || s.user_id;
            if (key && !userMap.has(key)) {
              userMap.set(key, {
                id: s.user_id,
                name: s.nom_scanneur || 'Agent Scanneur',
                phone: s.telephone_scanneur || '',
                role: 'SCANNEUR',
                badge: 'Scanneur assigné',
                category: 'SCANNEURS',
              });
            }
          }
        }
      } catch (err) {
        console.warn('[ScannerUserSelector] Erreur scanneurs :', err);
      }
    }

    // 2. Logs de scan des événements de l'organisateur pour retrouver les agents actifs
    try {
      const myEventsRes = await api.events.getMyEvents();
      const myEvents = myEventsRes?.results || [];
      if (myEvents && Array.isArray(myEvents)) {
        for (const evt of myEvents.slice(0, 5)) {
          try {
            const logsRes = await api.events.getLogsScan(evt.id);
            const logs = logsRes?.results || [];
            if (logs && Array.isArray(logs)) {
              for (const log of logs) {
                if (log.scanneur_telephone || log.scanneur_nom) {
                  const key = log.scanneur_telephone || log.scanneur_nom;
                  if (key && !userMap.has(key)) {
                    userMap.set(key, {
                      id: key,
                      name: log.scanneur_nom || 'Opérateur Scan',
                      phone: log.scanneur_telephone || '',
                      role: 'SCANNEUR',
                      badge: 'Agent de terrain',
                      category: 'SCANNEURS',
                    });
                  }
                }
              }
            }
          } catch {}
        }
      }
    } catch {}

    // 3. Candidats & Profils depuis l'API admin (demandes organisateurs enregistrées)
    try {
      const demandesRes = await api.admin.getDemandesOrganisateurs();
      if (demandesRes && demandesRes.results) {
        for (const d of demandesRes.results) {
          const key = d.telephone || d.id;
          if (key && !userMap.has(key)) {
            userMap.set(key, {
              id: d.id,
              name: d.nom_soumis || d.nom_entreprise || 'Utilisateur Enregistré',
              phone: d.telephone || '',
              role: 'ORGANISATEUR',
              badge: 'Organisateur KYC',
              category: 'ORGANISATEURS',
            });
          }
        }
      }
    } catch {
      // Normal si non-superadmin
    }

    // 4. Billets et bénéficiaires réels enregistrés sur le compte (GET /api/tickets/mes-billets/)
    try {
      const billetsRes = await api.tickets.getMesBillets();
      if (billetsRes && billetsRes.results) {
        for (const b of billetsRes.results) {
          if (b.destinataire_telephone && !userMap.has(b.destinataire_telephone)) {
            userMap.set(b.destinataire_telephone, {
              id: b.id,
              name: b.destinataire_nom || 'Bénéficiaire ticket',
              phone: b.destinataire_telephone,
              role: 'ACHETEUR',
              badge: 'Titulaire billet',
              category: 'ACHETEURS',
            });
          }
        }
      }
    } catch {}

    // 5. Billets en mémoire (bénéficiaires avec numéros réels)
    if (tickets && tickets.length > 0) {
      for (const t of tickets) {
        if (t.recipientPhone && !userMap.has(t.recipientPhone)) {
          userMap.set(t.recipientPhone, {
            id: t.id,
            name: t.recipientName || 'Titulaire de billet',
            phone: t.recipientPhone,
            role: 'ACHETEUR',
            badge: 'Bénéficiaire billet',
            category: 'ACHETEURS',
          });
        }
      }
    }

    // 6. Utilisateur connecté
    if (user && (user.phone || user.id)) {
      const userKey = user.phone || user.id;
      if (!userMap.has(userKey)) {
        userMap.set(userKey, {
          id: user.id,
          name: user.name || 'Moi (Compte actuel)',
          phone: user.phone || '',
          role: user.role,
          badge: 'Mon compte',
          category: user.role === 'ORGANISATEUR' ? 'ORGANISATEURS' : 'ACHETEUR' as any,
        });
      }
    }

    setCandidates(Array.from(userMap.values()));
    setLoading(false);
  };

  useEffect(() => {
    void loadUsersFromApi();
  }, [organisateurId, user, tickets]);

  // Filtrage en temps réel avec recherche et catégorie
  const filteredUsers = useMemo(() => {
    let list = candidates;

    if (selectedCategory === 'SCANNEURS') {
      list = list.filter((c) => c.category === 'SCANNEURS' || c.role === 'SCANNEUR');
    } else if (selectedCategory === 'ORGANISATEURS') {
      list = list.filter((c) => c.category === 'ORGANISATEURS' || c.role === 'ORGANISATEUR');
    } else if (selectedCategory === 'ACHETEURS') {
      list = list.filter((c) => c.category === 'ACHETEURS' || c.role === 'ACHETEUR');
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.badge && c.badge.toLowerCase().includes(q))
    );
  }, [candidates, searchQuery, selectedCategory]);

  // Vérifier si la recherche ressemble à une saisie manuelle (numéro burundais ou UUID)
  const isCustomInput = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return false;
    const exists = candidates.some((c) => 
      c.phone.replace(/\s+/g, '') === q.replace(/\s+/g, '') || 
      c.id === q
    );
    return !exists && (q.length >= 4);
  }, [candidates, searchQuery]);

  const handleSelectUser = (c: CandidateUser) => {
    const target = c.phone || c.id;
    onSelect({ target, name: c.name });
    setSearchQuery('');
    setShowFullEnum(false);
  };

  const handleSelectCustom = () => {
    const q = searchQuery.trim();
    if (!q) return;
    onSelect({ target: q, name: `Compte externe (${q})` });
    setSearchQuery('');
    setShowFullEnum(false);
  };

  return (
    <div className="space-y-2.5">
      {/* 1. Utilisateur sélectionné */}
      {selectedTarget ? (
        <div className="p-3 bg-purple-50/90 border-2 border-purple-300 rounded-xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-purple-950 truncate">
                  {selectedName || 'Utilisateur sélectionné'}
                </span>
                <span className="text-[9px] font-mono bg-purple-200 text-purple-900 px-1.5 py-0.5 rounded-full font-bold">
                  Prêt à être assigné
                </span>
              </div>
              <p className="text-[11px] font-mono text-purple-700 truncate mt-0.5 flex items-center gap-1">
                <Smartphone className="w-3 h-3 shrink-0" />
                Cible d'assignation : <strong>{selectedTarget}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="p-1.5 rounded-lg text-purple-600 hover:text-purple-900 hover:bg-purple-100 transition-colors cursor-pointer shrink-0"
            title="Changer d'utilisateur"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* 2. Barre de recherche + Enumération des utilisateurs de la base */
        <div className="space-y-2">
          {/* Champ de recherche avec filtre rapide */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setShowFullEnum(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowFullEnum(true);
              }}
              placeholder="Rechercher par nom, téléphone (+257...), rôle ou ID..."
              className="w-full pl-9 pr-20 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all shadow-xs"
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                  title="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void loadUsersFromApi()}
                disabled={loading}
                title="Actualiser les utilisateurs de la base"
                className="p-1 text-slate-400 hover:text-purple-600 rounded-md transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* En-tête de l'énumération avec filtres de catégories */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] px-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-slate-600 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                {candidates.length} utilisateur{candidates.length > 1 ? 's' : ''} en base
              </span>
              {loading && (
                <span className="text-purple-600 flex items-center gap-1 font-mono">
                  <Loader2 className="w-3 h-3 animate-spin" /> chargement...
                </span>
              )}
            </div>

            {/* Filtres par type */}
            <div className="flex items-center gap-1">
              {(['TOUS', 'SCANNEURS', 'ACHETEURS', 'ORGANISATEURS'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowFullEnum(true);
                  }}
                  className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-purple-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'TOUS' ? 'Tous' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Enumération déroulante / Liste des utilisateurs filtrés */}
          <div className="border border-slate-200 rounded-xl bg-white shadow-md divide-y divide-slate-100 overflow-hidden">
            {/* Bannière de saisie directe si l'utilisateur tapé n'est pas dans la liste */}
            {isCustomInput && (
              <button
                type="button"
                onClick={handleSelectCustom}
                className="w-full p-2.5 text-left bg-purple-50 hover:bg-purple-100 border-b border-purple-200 flex items-center justify-between text-xs text-purple-950 font-bold transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <PlusCircle className="w-4 h-4 text-purple-700 shrink-0" />
                  <span className="truncate">
                    Assigner directement : <code className="font-mono bg-purple-200 px-1.5 py-0.5 rounded text-purple-900">{searchQuery.trim()}</code>
                  </span>
                </div>
                <span className="text-[10px] font-mono text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200 shrink-0">
                  Sélectionner
                </span>
              </button>
            )}

            {/* Liste scrollable des utilisateurs */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
              {filteredUsers.length === 0 && !isCustomInput && (
                <div className="p-4 text-center text-xs text-slate-400 space-y-1">
                  <p>Aucun utilisateur ne correspond à votre filtre.</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Saisissez directement un numéro de téléphone (+257...) ou un UUID pour l'assigner.
                  </p>
                </div>
              )}

              {filteredUsers.map((c) => (
                <button
                  key={`${c.id}-${c.phone}`}
                  type="button"
                  onClick={() => handleSelectUser(c)}
                  className="w-full p-2.5 text-left hover:bg-purple-50/50 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-purple-100 text-slate-700 group-hover:text-purple-800 flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 group-hover:text-purple-950 truncate">
                          {c.name}
                        </span>
                        {c.badge && (
                          <span className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                            c.category === 'SCANNEURS'
                              ? 'bg-purple-100 text-purple-800'
                              : c.category === 'ORGANISATEURS'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {c.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <Smartphone className="w-2.5 h-2.5 text-slate-400" />
                        {c.phone || c.id}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-purple-700 bg-purple-50 group-hover:bg-purple-700 group-hover:text-white transition-colors shrink-0 flex items-center gap-1">
                    <UserPlus className="w-3 h-3" />
                    Choisir
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

