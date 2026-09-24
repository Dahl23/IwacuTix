import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { 
  CartItem, 
  TicketPurchased, 
  User, 
  Event, 
  AppNotification, 
  ScanneurAssignment, 
  PortefeuilleOrganisateur, 
  ParametrePlateforme, 
  Versement, 
  ScanLog,
  ApiDestinataireBillet
} from './types';
import { api, API_BASE_URL, getStoredAccessToken } from './services/apiClient';
import { apiEventToEvent, apiTicketToPurchased, apiUserToUser } from './services/apiMappers';
import { 
  MOCK_EVENTS,
  DEFAULT_ANONYMOUS_AVATAR,
  GUEST_USER
} from './data';

export type PersonaType = 'ACHETEUR' | 'ORGANISATEUR' | 'SCANNEUR' | 'SUPERADMIN';

// Brouillon de commande à créer côté backend (une commande par tier sélectionné)
export interface OrderDraft {
  event_id: string;
  tier_id: string;
  quantite: number;
  destinataires?: ApiDestinataireBillet[];
}

export interface ScanResult {
  success: boolean;
  message: string;
  ticket?: TicketPurchased;
  reason?: string;
}

export interface PlatformKycEntry {
  id: string;
  nom_structure: string;
  responsable: string;
  telephone: string;
  email: string;
  statut_verification: 'VERIFIE' | 'EN_ATTENTE' | 'REJETE';
  commission_taux: number;
  moyens: string[];
}

interface AppContextType {
  user: User;
  currentPersona: PersonaType;
  switchPersona: (persona: PersonaType) => void;
  cart: CartItem[];
  orderDrafts: OrderDraft[];
  setOrderDrafts: React.Dispatch<React.SetStateAction<OrderDraft[]>>;
  refreshTicketsFromApi: () => Promise<void>;
  tickets: TicketPurchased[];
  events: Event[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  addToCart: (eventId: string, eventTitle: string, categoryName: string, quantity: number, price: number, tierId?: string) => void;
  updateCartQuantity: (eventId: string, categoryName: string, quantity: number) => void;
  removeFromCart: (eventId: string, categoryName: string) => void;
  clearCart: () => void;
  addEvent: (newEvent: Event) => void;
  scanTicket: (ticketId: string) => void;
  scanTicketWithSecurity: (ticketCodeOrId: string, targetEventId: string) => ScanResult;
  notifications: AppNotification[];
  followedEventIds: string[];
  followEvent: (eventId: string) => void;
  unfollowEvent: (eventId: string) => void;
  addNotification: (title: string, body: string, type: 'approaching' | 'update' | 'system', eventId?: string, eventTitle?: string) => void;
  markAllNotificationsAsRead: () => void;
  publishOrganizerUpdate: (eventId: string, message: string) => void;
  
  // Scanneur staff management (Section 4 du cahier des charges)
  scanneurAssignments: ScanneurAssignment[];
  assignScanneur: (userNom: string, userPhone: string, eventId: string) => void;
  removeScanneurAssignment: (assignmentId: string) => void;

  // Organisateur portefeuilles (Section 5 & 6.E)
  portefeuille: PortefeuilleOrganisateur;

  // SuperAdmin Platform parameters & KYC (Section 5 & 6.E)
  parametrePlateforme: ParametrePlateforme;
  updateParametrePlateforme: (delaiJours: number, commissionTaux: number) => void;
  organisateursKyc: PlatformKycEntry[];
  updateOrganisateurKyc: (id: string, statut: 'VERIFIE' | 'REJETE') => void;
  versements: Versement[];

  // Scan logs (Section 5 & 8)
  scanLogs: ScanLog[];

  // Profile update and user management
  setUser: React.Dispatch<React.SetStateAction<User>>;
  updateUserProfile: (data: Partial<User>) => void;
  isUserVerified: boolean;
  logoutUser: () => void;

  // Global Auth Modal controls
  isAuthModalOpen: boolean;
  authModalReason?: 'RESERVATION' | 'ORGANISATEUR' | 'GENERAL';
  openAuthModal: (reason?: 'RESERVATION' | 'ORGANISATEUR' | 'GENERAL') => void;
  closeAuthModal: () => void;

  // KYC Verification for Organizers
  submitOrganizerKyc: (kycData: {
    nomLegal: string;
    numeroCni: string;
    email: string;
    cniRectoUrl: string;
    cniVersoUrl: string;
    structureName?: string;
  }) => void;

  // Dark mode & Theme
  themeMode: 'light' | 'dark' | 'system';
  isDarkMode: boolean;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPersona, setCurrentPersona] = useState<PersonaType>('ACHETEUR');

  // Dark mode & theme preference management (respects system preference and persists choice)
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      const saved = localStorage.getItem('iwacutix_theme_mode');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {}
    return 'system';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Calculate actual dark mode based on current mode and system preferences
  const isDarkMode = themeMode === 'system' ? systemPrefersDark : themeMode === 'dark';

  // Listen to OS system preference changes in real-time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      (mediaQuery as any).addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        (mediaQuery as any).removeListener(handler);
      }
    };
  }, []);

  // Sync `.dark` class on <html> and update meta theme-color tag
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDarkMode ? '#090A0F' : '#FF5500');
    }
  }, [isDarkMode]);

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setThemeModeState(mode);
    try {
      localStorage.setItem('iwacutix_theme_mode', mode);
    } catch {}
  };

  const toggleDarkMode = () => {
    const nextMode = isDarkMode ? 'light' : 'dark';
    setThemeMode(nextMode);
  };

  // Global Auth Modal controls
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<'RESERVATION' | 'ORGANISATEUR' | 'GENERAL' | undefined>(undefined);

  const openAuthModal = (reason: 'RESERVATION' | 'ORGANISATEUR' | 'GENERAL' = 'GENERAL') => {
    setAuthModalReason(reason);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalReason(undefined);
  };
  
  // Load saved custom profile if exists and verified; otherwise, default to unauthenticated visitor (GUEST_USER)
  const [user, setUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('iwacutix_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        // User must be verified with a valid phone number and real id
        if (parsed && parsed.telephone_verifie === true && parsed.phone && parsed.phone.trim().length > 0 && parsed.id !== 'guest') {
          if (!parsed.avatarUrl || parsed.avatarUrl.includes('photo-1534528741775-53994a69daeb')) {
            parsed.avatarUrl = DEFAULT_ANONYMOUS_AVATAR;
          }
          return { ...GUEST_USER, ...parsed };
        }
      }
    } catch {}
    // First-time visitor has no account created yet
    return GUEST_USER;
  });

  // Is user verified with real name, phone, and OTP SMS verification?
  const isUserVerified = Boolean(
    user && 
    user.telephone_verifie === true && 
    user.phone && 
    user.phone.trim().length > 0 && 
    user.id !== 'guest'
  );

  const updateUserProfile = (data: Partial<User>) => {
    setUser((prev) => {
      const updated = { ...prev, ...data };
      try {
        localStorage.setItem('iwacutix_user_profile', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const logoutUser = () => {
    try {
      localStorage.removeItem('iwacutix_user_profile');
      localStorage.removeItem('iwacutix_user_tickets');
    } catch {}
    setUser(GUEST_USER);
    setTickets([]);
    setCurrentPersona('ACHETEUR');
  };

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderDrafts, setOrderDrafts] = useState<OrderDraft[]>([]);
  const [tickets, setTickets] = useState<TicketPurchased[]>(() => {
    try {
      const saved = localStorage.getItem('iwacutix_user_tickets');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('iwacutix_user_tickets', JSON.stringify(tickets));
    } catch {}
  }, [tickets]);
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const eventsRef = useRef<Event[]>(MOCK_EVENTS);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Rafraîchir les billets de l'acheteur depuis le backend (/api/tickets/mes-billets/)
  const refreshTicketsFromApi = useCallback(async () => {
    if (!getStoredAccessToken()) return;
    try {
      const res = await api.tickets.getMesBillets();
      if (!res || !res.results) return;
      const mapped = res.results.map((billet) => apiTicketToPurchased(billet, eventsRef.current));
      setTickets(mapped);
    } catch {
      // Backend indisponible → on conserve l'état local
    }
  }, []);

  // Chargement du marketplace public : /api/public/evenements/ + détail (tiers & medias)
  const loadPublicEvents = useCallback(async () => {
    try {
      const page1 = await api.public.getEvenements();
      if (!page1 || !page1.results || page1.results.length === 0) return;
      const fetched: Event[] = [];
      for (const evt of page1.results) {
        let detailed = evt;
        if (!evt.tiers || evt.tiers.length === 0) {
          try {
            detailed = await api.public.getEvenement(evt.id);
          } catch {}
        }
        fetched.push(apiEventToEvent(detailed, API_BASE_URL));
      }
      if (fetched.length > 0) setEvents(fetched);
    } catch {
      // Backend indisponible → MOCK_EVENTS conservés
    }
  }, []);

  // Restauration de session (JWT) + chargement du marketplace au démarrage
  useEffect(() => {
    loadPublicEvents();
    if (!getStoredAccessToken()) return;
    api.auth.me()
      .then((me) => {
        setUser((prev) => ({ ...prev, ...apiUserToUser(me, prev, API_BASE_URL) }));
        activatePersonaFromRole(me.role);
      })
      .catch(() => {});
  }, [loadPublicEvents]);

  const activatePersonaFromRole = (role: string) => {
    if (role === 'ORGANISATEUR') setCurrentPersona('ORGANISATEUR');
    else if (role === 'SUPERADMIN') setCurrentPersona('SUPERADMIN');
    else setCurrentPersona('ACHETEUR');
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  // Multi-tenant & staff states
  const [scanneurAssignments, setScanneurAssignments] = useState<ScanneurAssignment[]>([]);
  const [portefeuille] = useState<PortefeuilleOrganisateur>({
    organisateur_id: '',
    nom_structure: '',
    solde_disponible_fbu: 0,
    solde_disponible_sats: 0,
    solde_total_genere_fbu: 0,
    solde_total_genere_sats: 0,
    derniere_maj: '-'
  });
  const [parametrePlateforme, setParametrePlateforme] = useState<ParametrePlateforme>({
    delai_versement_jours: 7,
    jour_execution_versement: 'DIMANCHE',
    commission_taux_defaut: 5,
    modifie_par: '-',
    date_modification: '-'
  });
  const [organisateursKyc, setOrganisateursKyc] = useState<PlatformKycEntry[]>([]);
  const [versements, setVersements] = useState<Versement[]>([]);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [followedEventIds, setFollowedEventIds] = useState<string[]>([]);

  // Switch demo persona with requirement to have verified buyer account before switching to organizer
  const switchPersona = (persona: PersonaType) => {
    if (persona === 'ORGANISATEUR' && !isUserVerified) {
      openAuthModal('ORGANISATEUR');
      return;
    }
    setCurrentPersona(persona);
    if (persona === 'ACHETEUR') {
      if (!isUserVerified) {
        setUser(GUEST_USER);
      } else {
        setUser((prev) => ({ ...prev, role: 'ACHETEUR' }));
      }
    } else if (persona === 'ORGANISATEUR') {
      setUser((prev) => ({
        ...prev,
        role: 'ORGANISATEUR',
        organisateurProfile: prev.organisateurProfile || {
          user_id: prev.id,
          nom_structure: prev.name ? `${prev.name} Productions` : "Vital'O Football Club Burundi",
          numero_mobile_money_reception: prev.phone || '+257 79 100 200',
          statut_verification: 'EN_ATTENTE',
          commission_taux: 5,
        }
      }));
    } else if (persona === 'SCANNEUR') {
      setUser((prev) => ({ ...prev }));
    } else if (persona === 'SUPERADMIN') {
      setUser((prev) => ({ ...prev }));
    }
  };

  const addToCart = (eventId: string, eventTitle: string, categoryName: string, quantity: number, price: number, tierId?: string) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.eventId === eventId && item.categoryName === categoryName
      );

      if (existingIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += quantity;
        if (tierId && !newCart[existingIndex].tierId) newCart[existingIndex].tierId = tierId;
        return newCart;
      }

      return [...prevCart, { eventId, eventTitle, categoryName, quantity, price, tierId }];
    });
  };

  const updateCartQuantity = (eventId: string, categoryName: string, quantity: number) => {
    setCart((prevCart) => {
      if (quantity <= 0) {
        return prevCart.filter((item) => !(item.eventId === eventId && item.categoryName === categoryName));
      }
      return prevCart.map((item) =>
        item.eventId === eventId && item.categoryName === categoryName
          ? { ...item, quantity }
          : item
      );
    });
  };

  const removeFromCart = (eventId: string, categoryName: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => !(item.eventId === eventId && item.categoryName === categoryName))
    );
  };

  const clearCart = () => {
    setCart([]);
  };


  const addEvent = (newEvent: Event) => {
    setEvents((prev) => [newEvent, ...prev]);
  };

  const scanTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'utilise' } : t))
    );
  };

  // Section 4 & 8: Scan atomique avec vérification stricte du ScanneurAssignment
  const scanTicketWithSecurity = (ticketCodeOrId: string, targetEventId: string): ScanResult => {
    const cleanedQuery = ticketCodeOrId.trim().toUpperCase();

    // 1. Vérification d'assignation
    const hasActiveAssignment = scanneurAssignments.some(
      (asg) => asg.event_id === targetEventId && asg.actif
    ) || user.role === 'ORGANISATEUR' || user.role === 'SUPERADMIN';

    if (!hasActiveAssignment && currentPersona === 'SCANNEUR' && user.activeAssignmentEventId !== targetEventId) {
      const targetEvent = events.find(e => e.id === targetEventId);
      const logEntry: ScanLog = {
        id: `slog-${Date.now()}`,
        ticket_id: cleanedQuery,
        event_id: targetEventId,
        event_titre: targetEvent?.title || 'Événement',
        scanned_at: 'À l\'instant',
        scanned_by_nom: user.name,
        scanned_by_user_id: user.id,
        statut_validation: 'REJETE',
        raison_rejet: `Scanneur non assigné à cet événement`
      };
      setScanLogs(prev => [logEntry, ...prev]);

      return {
        success: false,
        message: 'Accès refusé au poste de scan',
        reason: `Vous n'avez pas de ScanneurAssignment actif pour cet événement.`
      };
    }

    // 2. Recherche du ticket
    const ticket = tickets.find(
      (t) => t.id.toUpperCase() === cleanedQuery || 
             t.qrCodeValue.toUpperCase().includes(cleanedQuery) ||
             (t.qr_code_hash && t.qr_code_hash.includes(cleanedQuery))
    );

    if (!ticket) {
      const logEntry: ScanLog = {
        id: `slog-${Date.now()}`,
        ticket_id: cleanedQuery,
        event_id: targetEventId,
        event_titre: 'Événement',
        scanned_at: 'À l\'instant',
        scanned_by_nom: user.name,
        scanned_by_user_id: user.id,
        statut_validation: 'REJETE',
        raison_rejet: 'Billet introuvable / Code invalide'
      };
      setScanLogs(prev => [logEntry, ...prev]);

      return {
        success: false,
        message: 'Billet introuvable',
        reason: 'Le code scanné ne correspond à aucun billet officiel émis par IwacuTix.'
      };
    }

    // 3. Vérification que le billet appartient bien à cet événement
    if (ticket.eventId !== targetEventId) {
      const logEntry: ScanLog = {
        id: `slog-${Date.now()}`,
        ticket_id: ticket.id,
        event_id: targetEventId,
        event_titre: ticket.eventTitle,
        scanned_at: 'À l\'instant',
        scanned_by_nom: user.name,
        scanned_by_user_id: user.id,
        statut_validation: 'REJETE',
        raison_rejet: `Billet d'un autre événement : "${ticket.eventTitle}"`,
        tier_name: ticket.categoryName
      };
      setScanLogs(prev => [logEntry, ...prev]);

      return {
        success: false,
        message: 'Billet d\'un autre événement',
        reason: `Ce billet est valable pour "${ticket.eventTitle}", pas pour cet événement.`
      };
    }

    // 4. Vérification anti-double-usage (Section 6.C & 8)
    if (ticket.status === 'utilise') {
      const logEntry: ScanLog = {
        id: `slog-${Date.now()}`,
        ticket_id: ticket.id,
        event_id: targetEventId,
        event_titre: ticket.eventTitle,
        scanned_at: 'À l\'instant',
        scanned_by_nom: user.name,
        scanned_by_user_id: user.id,
        statut_validation: 'REJETE',
        raison_rejet: 'Tentative de réutilisation (Billet déjà composté)',
        tier_name: ticket.categoryName
      };
      setScanLogs(prev => [logEntry, ...prev]);

      return {
        success: false,
        message: 'ALERTE : Billet déjà utilisé !',
        reason: 'Ce billet a déjà été validé à l\'entrée. Tentative de double passage interceptée.'
      };
    }

    // 5. Validation atomique
    setTickets((prev) =>
      prev.map((t) => (t.id === ticket.id ? { ...t, status: 'utilise' } : t))
    );

    const logEntry: ScanLog = {
      id: `slog-${Date.now()}`,
      ticket_id: ticket.id,
      event_id: targetEventId,
      event_titre: ticket.eventTitle,
      scanned_at: 'À l\'instant',
      scanned_by_nom: user.name,
      scanned_by_user_id: user.id,
      statut_validation: 'ACCEPTE',
      tier_name: ticket.categoryName
    };
    setScanLogs(prev => [logEntry, ...prev]);

    return {
      success: true,
      message: `Entrée autorisée — ${ticket.categoryName}`,
      ticket
    };
  };

  // Assignation d'un scanneur par l'organisateur (Section 4)
  const assignScanneur = (userNom: string, userPhone: string, eventId: string) => {
    const targetEvent = events.find(e => e.id === eventId);
    const newAssignment: ScanneurAssignment = {
      id: `asg-${Date.now()}`,
      user_id: `usr-scan-${Date.now()}`,
      user_nom: userNom,
      user_telephone: userPhone.startsWith('+257') ? userPhone : `+257 ${userPhone}`,
      event_id: eventId,
      event_titre: targetEvent?.title || 'Événement',
      assigne_par: user.name,
      date_assignation: 'À l\'instant',
      actif: true
    };
    setScanneurAssignments(prev => [newAssignment, ...prev]);
  };

  const removeScanneurAssignment = (assignmentId: string) => {
    setScanneurAssignments(prev => prev.filter(a => a.id !== assignmentId));
  };

  const updateParametrePlateforme = (delaiJours: number, commissionTaux: number) => {
    setParametrePlateforme({
      delai_versement_jours: delaiJours,
      jour_execution_versement: 'DIMANCHE',
      commission_taux_defaut: commissionTaux,
      modifie_par: user.name,
      date_modification: 'À l\'instant'
    });
  };

  const updateOrganisateurKyc = (id: string, statut: 'VERIFIE' | 'REJETE') => {
    setOrganisateursKyc(prev => prev.map(org => org.id === id ? { ...org, statut_verification: statut } : org));
  };

  const submitOrganizerKyc = (kycData: {
    nomLegal: string;
    numeroCni: string;
    email: string;
    cniRectoUrl: string;
    cniVersoUrl: string;
    structureName?: string;
  }) => {
    const updatedUser: User = {
      ...user,
      name: kycData.nomLegal,
      email: kycData.email,
      role: 'ORGANISATEUR',
      statut_compte: 'ACTIF',
      telephone_verifie: true,
      organisateurProfile: {
        user_id: user.id,
        nom_structure: kycData.structureName || kycData.nomLegal,
        numero_mobile_money_reception: user.phone,
        adresse_lightning_reception: user.organisateurProfile?.adresse_lightning_reception || '',
        statut_verification: 'EN_ATTENTE',
        commission_taux: 5,
      }
    };
    setUser(updatedUser);
    setCurrentPersona('ORGANISATEUR');

    // Also register into organisateursKyc list for platform transparency
    setOrganisateursKyc(prev => [
      {
        id: user.id,
        nom_structure: kycData.structureName || kycData.nomLegal,
        responsable: kycData.nomLegal,
        telephone: user.phone,
        email: kycData.email,
        statut_verification: 'EN_ATTENTE' as const,
        commission_taux: 5,
        moyens: [`Mobile Money (${user.phone})`]
      },
      ...prev
    ]);
  };

  const followEvent = (eventId: string) => {
    setFollowedEventIds((prev) => {
      if (prev.includes(eventId)) return prev;
      return [...prev, eventId];
    });

    const targetEvent = events.find((e) => e.id === eventId);
    if (targetEvent) {
      addNotification(
        `Suivi activé : ${targetEvent.title} 🔔`,
        `Vous recevrez des alertes quand cet événement approchera. Date : ${targetEvent.date} à ${targetEvent.time}.`,
        'approaching',
        targetEvent.id,
        targetEvent.title
      );
    }
  };

  const unfollowEvent = (eventId: string) => {
    setFollowedEventIds((prev) => prev.filter((id) => id !== eventId));
  };

  const addNotification = (
    title: string,
    body: string,
    type: 'approaching' | 'update' | 'system',
    eventId?: string,
    eventTitle?: string
  ) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title,
      body,
      date: 'À l\'instant',
      type,
      eventId,
      eventTitle,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const publishOrganizerUpdate = (eventId: string, message: string) => {
    const targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent) return;

    addNotification(
      `Annonce Organisateur : ${targetEvent.title} 📢`,
      `L'organisateur de "${targetEvent.title}" annonce : "${message}"`,
      'update',
      eventId,
      targetEvent.title
    );
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        updateUserProfile,
        isUserVerified,
        logoutUser,
        isAuthModalOpen,
        authModalReason,
        openAuthModal,
        closeAuthModal,
        currentPersona,
        switchPersona,
        cart,
        orderDrafts,
        setOrderDrafts,
        refreshTicketsFromApi,
        tickets,
        events,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        addEvent,
        scanTicket,
        scanTicketWithSecurity,
        notifications,
        followedEventIds,
        followEvent,
        unfollowEvent,
        addNotification,
        markAllNotificationsAsRead,
        publishOrganizerUpdate,
        scanneurAssignments,
        assignScanneur,
        removeScanneurAssignment,
        portefeuille,
        parametrePlateforme,
        updateParametrePlateforme,
        organisateursKyc,
        updateOrganisateurKyc,
        versements,
        scanLogs,
        submitOrganizerKyc,
        themeMode,
        isDarkMode,
        setThemeMode,
        toggleDarkMode
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

