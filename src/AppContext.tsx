import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { 
  CartItem, 
  TicketPurchased, 
  User, 
  Event, 
  AppNotification, 
  PortefeuilleOrganisateur, 
  ParametrePlateforme, 
  Versement, 
  ApiDestinataireBillet
} from './types';
import { api, API_BASE_URL, getStoredAccessToken, clearStoredTokens } from './services/apiClient';
import { apiEventToEvent, apiTicketToPurchased, apiUserToUser } from './services/apiMappers';
import { useUserEventsWebSocket } from './hooks/useWebSocket';
import { 
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
  notifications: AppNotification[];
  followedEventIds: string[];
  followEvent: (eventId: string) => void;
  unfollowEvent: (eventId: string) => void;
  addNotification: (title: string, body: string, type: 'approaching' | 'update' | 'system', eventId?: string, eventTitle?: string) => void;
  markAllNotificationsAsRead: () => void;
  publishOrganizerUpdate: (eventId: string, message: string) => void;
  
  // Organisateur portefeuilles (Section 5 & 6.E)
  portefeuille: PortefeuilleOrganisateur;

  // SuperAdmin Platform parameters & KYC (Section 5 & 6.E)
  parametrePlateforme: ParametrePlateforme;
  updateParametrePlateforme: (params: Partial<ParametrePlateforme>) => void;
  organisateursKyc: PlatformKycEntry[];
  updateOrganisateurKyc: (id: string, statut: 'VERIFIE' | 'REJETE') => void;
  versements: Versement[];

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

  // KYC Verification for Organizers (transmis via /api/organisateurs/demandes/)
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
        // User must be a real registered account (register/login flow)
        if (parsed && parsed.id && parsed.id !== 'guest' && parsed.role && parsed.statut_compte === 'ACTIF') {
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

  // Compte réel (register/login) & actif, quel que soit le rôle. La vérification OTP téléphone n'existe plus
  // pour les acheteurs (remplacée par email_verifie optionnelle).
  const isUserVerified = Boolean(
    user &&
    user.id &&
    user.id !== 'guest' &&
    user.role &&
    user.statut_compte === 'ACTIF'
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
    // Purge les jetons JWT (accès + refresh) pour terminer la session côté serveur
    clearStoredTokens();
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
  const [events, setEvents] = useState<Event[]>([]);
  const eventsRef = useRef<Event[]>([]);
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
      // Backend indisponible → liste vide conservée
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

  // Échec de refresh JWT (expiré/révoqué) → déconnexion forcée, retour invité
  useEffect(() => {
    const onSessionExpired = () => logoutUser();
    window.addEventListener('iwacutix:session-expired', onSessionExpired);
    return () => window.removeEventListener('iwacutix:session-expired', onSessionExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activatePersonaFromRole = (role: string) => {
    if (role === 'ORGANISATEUR') setCurrentPersona('ORGANISATEUR');
    else if (role === 'SUPERADMIN') setCurrentPersona('SUPERADMIN');
    else setCurrentPersona('ACHETEUR');
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  // Multi-tenant states
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
    id: '',
    commission_taux_defaut: '0.0200',
    canal_commission: 'LIGHTNING',
    destination_commission: '',
    date_modification: '-'
  });
  const [organisateursKyc, setOrganisateursKyc] = useState<PlatformKycEntry[]>([]);
  const [versements, setVersements] = useState<Versement[]>([]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [followedEventIds, setFollowedEventIds] = useState<string[]>([]);

  // Switch demo persona with requirement to have verified buyer account before switching to organizer
  const switchPersona = (persona: PersonaType) => {
    if (persona === 'ORGANISATEUR' && !isUserVerified) {
      openAuthModal('ORGANISATEUR');
      return;
    }
    setCurrentPersona(persona);
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

  const updateParametrePlateforme = (params: Partial<ParametrePlateforme>) => {
    setParametrePlateforme({
      ...parametrePlateforme,
      ...params,
      date_modification: 'À l\'instant'
    });
  };

  const updateOrganisateurKyc = (id: string, statut: 'VERIFIE' | 'REJETE') => {
    setOrganisateursKyc(prev => prev.map(org => org.id === id ? { ...org, statut_verification: statut } : org));
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

  const addNotification = useCallback((
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
  }, []);

  // Canal temps réel WebSocket : /ws/evenements/ (Guide développeur WEBSOCKET.md §3)
  // Reçoit les événements de commandes (création, statut) et règlements sans polling
  useUserEventsWebSocket({
    enabled: isUserVerified,
    onCommandeStatut: (evt) => {
      const { order_id, statut, quantite, montant_fbu, raison } = evt.donnees;
      if (statut === 'SUCCESS') {
        refreshTicketsFromApi();
        addNotification(
          'Paiement confirmé 🎉',
          `Votre commande #${order_id.slice(0, 8)} (${quantite} billet(s), ${montant_fbu} FBu) a été validée. Vos billets sont disponibles.`,
          'update'
        );
      } else if (statut === 'EXPIRE') {
        addNotification(
          'Réservation expirée ⏱️',
          `La réservation pour la commande #${order_id.slice(0, 8)} a expiré (10 minutes).`,
          'system'
        );
      } else if (statut === 'ECHEC') {
        addNotification(
          'Paiement non abouti ⚠️',
          `La commande #${order_id.slice(0, 8)} a échoué${raison ? ` : ${raison}` : ''}.`,
          'system'
        );
      }
    },
    onReglement: (evt) => {
      const { role, statut, montant_sats } = evt.donnees;
      if (statut === 'REUSSI') {
        addNotification(
          'Règlement validé ⚡',
          `Règlement ${role.toLowerCase()} de ${montant_sats.toLocaleString()} sats confirmé.`,
          'system'
        );
      }
    },
  });

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
        notifications,
        followedEventIds,
        followEvent,
        unfollowEvent,
        addNotification,
        markAllNotificationsAsRead,
        publishOrganizerUpdate,
        portefeuille,
        parametrePlateforme,
        updateParametrePlateforme,
        organisateursKyc,
        updateOrganisateurKyc,
        versements,
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

