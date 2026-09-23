import React, { createContext, useContext, useState, ReactNode } from 'react';
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
  ScanLog 
} from './types';
import { 
  MOCK_BUYER_USER, 
  MOCK_ORGANIZER_USER, 
  MOCK_SCANNER_USER, 
  MOCK_ADMIN_USER,
  MOCK_PURCHASED_TICKETS, 
  MOCK_EVENTS,
  MOCK_SCANNER_ASSIGNMENTS,
  MOCK_ORGANISATEUR_PORTEFEUILLE,
  MOCK_PARAMETRE_PLATEFORME,
  MOCK_VERSEMENTS,
  MOCK_SCAN_LOGS,
  MOCK_ORGANISATEURS_KYC,
  DEFAULT_ANONYMOUS_AVATAR,
  GUEST_USER
} from './data';

export type PersonaType = 'ACHETEUR' | 'ORGANISATEUR' | 'SCANNEUR' | 'SUPERADMIN';

export interface ScanResult {
  success: boolean;
  message: string;
  ticket?: TicketPurchased;
  reason?: string;
}

interface AppContextType {
  user: User;
  currentPersona: PersonaType;
  switchPersona: (persona: PersonaType) => void;
  cart: CartItem[];
  tickets: TicketPurchased[];
  events: Event[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  addToCart: (eventId: string, eventTitle: string, categoryName: string, quantity: number, price: number) => void;
  updateCartQuantity: (eventId: string, categoryName: string, quantity: number) => void;
  removeFromCart: (eventId: string, categoryName: string) => void;
  clearCart: () => void;
  checkout: (
    paymentMethod: string, 
    phone: string, 
    giftDetails?: { 
      isGift: boolean; 
      recipientName?: string; 
      recipientPhone?: string; 
      recipientHasNoPhone?: boolean; 
    }
  ) => TicketPurchased[];
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
  organisateursKyc: typeof MOCK_ORGANISATEURS_KYC;
  updateOrganisateurKyc: (id: string, statut: 'VERIFIE' | 'REJETE') => void;
  versements: Versement[];

  // Scan logs (Section 5 & 8)
  scanLogs: ScanLog[];

  // OTP flow simulation
  requestOtp: (phone: string) => string;
  verifyOtp: (code: string) => boolean;

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPersona, setCurrentPersona] = useState<PersonaType>('ACHETEUR');

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
    } catch {}
    setUser(GUEST_USER);
    setCurrentPersona('ACHETEUR');
  };

  const [cart, setCart] = useState<CartItem[]>([]);
  const [tickets, setTickets] = useState<TicketPurchased[]>(MOCK_PURCHASED_TICKETS);
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  // Multi-tenant & staff states
  const [scanneurAssignments, setScanneurAssignments] = useState<ScanneurAssignment[]>(MOCK_SCANNER_ASSIGNMENTS);
  const [portefeuille, setPortefeuille] = useState<PortefeuilleOrganisateur>(MOCK_ORGANISATEUR_PORTEFEUILLE);
  const [parametrePlateforme, setParametrePlateforme] = useState<ParametrePlateforme>(MOCK_PARAMETRE_PLATEFORME);
  const [organisateursKyc, setOrganisateursKyc] = useState(MOCK_ORGANISATEURS_KYC);
  const [versements, setVersements] = useState<Versement[]>(MOCK_VERSEMENTS);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>(MOCK_SCAN_LOGS);

  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif-1',
      title: 'FestiBuja Live Session approche ! ⏰',
      body: 'L\'événement FestiBuja Live Session commence dans 2 jours au Boulevard de l\'Uprona. Préparez vos billets !',
      date: 'Il y a 30 min',
      type: 'approaching',
      eventId: 'evt-festi-bujumbura-2026',
      eventTitle: 'FestiBujumbura Live : Sat-B & Friends',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Bienvenue sur IwacuTix Burundi ! 🎫',
      body: 'La billetterie 100% digitale du Burundi. Payez via Lumicash, EcoCash, Bancobu ou Bitcoin Lightning (Blink).',
      date: 'Hier',
      type: 'system',
      read: true,
    }
  ]);
  const [followedEventIds, setFollowedEventIds] = useState<string[]>(['evt-vital-o-vs-le-messager']);

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
          statut_verification: 'VERIFIE',
          commission_taux: 5,
        }
      }));
    } else if (persona === 'SCANNEUR') {
      setUser(MOCK_SCANNER_USER);
    } else if (persona === 'SUPERADMIN') {
      setUser(MOCK_ADMIN_USER);
    }
  };

  const addToCart = (eventId: string, eventTitle: string, categoryName: string, quantity: number, price: number) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.eventId === eventId && item.categoryName === categoryName
      );

      if (existingIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingIndex].quantity += quantity;
        return newCart;
      }

      return [...prevCart, { eventId, eventTitle, categoryName, quantity, price }];
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

  const checkout = (
    paymentMethod: string, 
    phone: string,
    giftDetails?: { 
      isGift: boolean; 
      recipientName?: string; 
      recipientPhone?: string; 
      recipientHasNoPhone?: boolean; 
    }
  ): TicketPurchased[] => {
    const newPurchased: TicketPurchased[] = [];
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let totalFbuAdded = 0;
    let totalSatsAdded = 0;
    const isLightning = paymentMethod.toLowerCase().includes('blink') || paymentMethod.toLowerCase().includes('lightning');

    cart.forEach((item) => {
      const parentEvent = events.find(e => e.id === item.eventId);
      for (let i = 0; i < item.quantity; i++) {
        const randomSalt = Math.floor(1000 + Math.random() * 9000);
        const ticketId = `ITX-${randomSalt}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 10)}`;
        // Simulated signed HMAC/JWT hash (Section 8 du cahier des charges)
        const qrHash = `HMAC_SHA256.${btoa(`${ticketId}:${item.eventId}:VALID`)}.${Math.random().toString(36).substring(2, 10)}`;

        newPurchased.push({
          id: ticketId,
          eventId: item.eventId,
          eventTitle: item.eventTitle,
          eventCategory: parentEvent?.category || 'sport',
          eventDate: parentEvent?.date || 'Date de l\'événement',
          eventTime: parentEvent?.time || '15:00',
          eventLocation: parentEvent?.location || 'Bujumbura',
          categoryName: item.categoryName,
          price: item.price,
          qrCodeValue: `IWACUTIX-SECURE-${ticketId}`,
          qr_code_hash: qrHash,
          purchaseDate: dateStr,
          status: 'valide',
          phoneUsed: phone,
          paymentMethod: paymentMethod,
          isGift: giftDetails?.isGift || false,
          recipientName: giftDetails?.recipientName || '',
          recipientPhone: giftDetails?.recipientPhone || '',
          recipientHasNoPhone: giftDetails?.recipientHasNoPhone || false,
        });

        if (isLightning) {
          // Approx 1 sat = ~3.2 FBu
          totalSatsAdded += Math.round(item.price / 3.2);
        } else {
          totalFbuAdded += item.price;
        }
      }
    });

    // Update organizer wallet balance (Section 6.E)
    if (totalFbuAdded > 0 || totalSatsAdded > 0) {
      setPortefeuille((prev) => ({
        ...prev,
        solde_disponible_fbu: prev.solde_disponible_fbu + Math.round(totalFbuAdded * 0.95), // 5% commission retenue
        solde_disponible_sats: prev.solde_disponible_sats + Math.round(totalSatsAdded * 0.95),
        solde_total_genere_fbu: prev.solde_total_genere_fbu + totalFbuAdded,
        solde_total_genere_sats: prev.solde_total_genere_sats + totalSatsAdded,
        derniere_maj: 'À l\'instant'
      }));
    }

    setTickets((prev) => [...newPurchased, ...prev]);
    clearCart();
    return newPurchased;
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

  const requestOtp = (phone: string) => {
    return '1234'; // Simulated code
  };

  const verifyOtp = (code: string) => {
    if (code === '1234' || code.length === 4) {
      setUser(prev => ({
        ...prev,
        telephone_verifie: true,
        statut_compte: 'ACTIF'
      }));
      return true;
    }
    return false;
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
        adresse_lightning_reception: `${kycData.nomLegal.toLowerCase().replace(/[^a-z0-9]/g, '')}@blink.sv`,
        statut_verification: 'VERIFIE',
        commission_taux: 5,
        document_verification: `CNI-${kycData.numeroCni}`
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
        statut_verification: 'VERIFIE' as const,
        commission_taux: 5,
        moyens: [`Mobile Money (${user.phone})`, `Blink Lightning`]
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
        checkout,
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
        requestOtp,
        verifyOtp,
        submitOrganizerKyc
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

