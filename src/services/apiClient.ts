import {
  ApiAuthResponse,
  ApiCommandeOrder,
  ApiCommandePayload,
  ApiCommandeResponse,
  ApiErrorResponse,
  ApiEvenementPublic,
  ApiLumicashConfirmerResponse,
  ApiLumicashDemanderOtpPayload,
  ApiLumicashDemanderOtpResponse,
  ApiMedia,
  ApiPaymentMethod,
  ApiScanResult,
  ApiTicket,
  ApiTier,
  ApiUser,
  PaginatedResponse,
  ParametrePlateforme,
  ScanneurAssignment,
} from '../types';
import { MOCK_EVENTS, MOCK_PURCHASED_TICKETS } from '../data';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
export const API_BASE_URL = metaEnv?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const ACCESS_TOKEN_KEY = 'iwacutix_access_token';
const REFRESH_TOKEN_KEY = 'iwacutix_refresh_token';

let isBackendLive: boolean | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export const getApiConnectionStatus = (): boolean | null => isBackendLive;

export const getStoredAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getStoredRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);

export const setStoredTokens = (access: string, refresh: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};

export const clearStoredTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const isFormData = (value: unknown): value is FormData => {
  return typeof FormData !== 'undefined' && value instanceof FormData;
};

const isAuthEndpointWithoutRefresh = (endpoint: string) => {
  return (
    endpoint.includes('/api/auth/login/') ||
    endpoint.includes('/api/auth/verifier-otp/') ||
    endpoint.includes('/api/auth/demander-otp/') ||
    endpoint.includes('/api/auth/token/refresh/')
  );
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refresh = getStoredRefreshToken();
  if (!refresh) return null;

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
      .then(async (response) => {
        if (!response.ok) {
          clearStoredTokens();
          return null;
        }

        const data = (await response.json()) as { access: string; refresh: string };
        setStoredTokens(data.access, data.refresh);
        return data.access;
      })
      .catch(() => {
        clearStoredTokens();
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
};

async function request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  const access = getStoredAccessToken();
  if (access && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${access}`);
  }

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (isFormData(options.body) && headers.has('Content-Type')) {
    headers.delete('Content-Type');
  }

  try {
    const response = await fetch(url, { ...options, headers });
    isBackendLive = true;

    if (response.status === 401 && !isRetry && !isAuthEndpointWithoutRefresh(endpoint)) {
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        const retryHeaders = new Headers(options.headers || {});
        retryHeaders.set('Authorization', `Bearer ${newAccess}`);
        return request<T>(endpoint, { ...options, headers: retryHeaders }, true);
      }
    }

    if (!response.ok) {
      let errorBody: ApiErrorResponse | Record<string, string[]>;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { error: response.statusText, code: 'http_error' };
      }
      throw errorBody;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err: any) {
    if (err instanceof TypeError && /fetch|network/i.test(err.message || '')) {
      isBackendLive = false;
      console.warn(`[IwacuTix API] Backend ${API_BASE_URL} non joignable. Fallback local active.`);
      return mockFallback<T>(endpoint, options);
    }

    throw err;
  }
}

const pageUrl = (endpoint: string, page?: number) => {
  if (!page) return endpoint;
  return `${endpoint}?page=${page}`;
};

const readJsonBody = (options: RequestInit): any => {
  if (!options.body || typeof options.body !== 'string') return {};
  try {
    return JSON.parse(options.body);
  } catch {
    return {};
  }
};

const makePaginated = <T>(results: T[]): PaginatedResponse<T> => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const mockTierId = (eventId: string, index: number) => `tier-${eventId}-${index + 1}`;

const mockEventDate = (index: number) => {
  const date = new Date(Date.UTC(2026, 11, 1 + index, 18, 0, 0));
  return date.toISOString();
};

const mockEventToApi = (event: (typeof MOCK_EVENTS)[number], index = 0, withDetails = false): ApiEvenementPublic => ({
  id: event.id,
  titre: event.title,
  description: event.description,
  affiche: event.imageUrl,
  lieu: event.location,
  ville: event.location.includes(',') ? event.location.split(',').at(-1)?.trim() || 'Bujumbura' : 'Bujumbura',
  date_debut: mockEventDate(index),
  date_fin: null,
  categorie:
    event.category === 'sport'
      ? 'SPORT'
      : event.category === 'musique'
        ? 'CONCERT'
        : event.category === 'religion'
          ? 'RELIGIEUX'
          : 'CONFERENCE',
  organisateur: event.organisateur,
  tiers: withDetails
    ? event.ticketCategories.map((category, categoryIndex) => ({
        id: mockTierId(event.id, categoryIndex),
        nom: category.name,
        prix_fbu: category.price.toFixed(2),
        stock_disponible: category.available,
        stock_total: category.available + 50,
        moyens_paiement_acceptes: ['LUMICASH', 'LIGHTNING'] as ApiPaymentMethod[],
      }))
    : undefined,
  medias: withDetails
    ? [
        {
          id: `media-${event.id}`,
          type_media: 'IMAGE',
          fichier: event.imageUrl,
          url_externe: '',
          ordre: 0,
          date_ajout: new Date().toISOString(),
        },
      ]
    : undefined,
});

const findMockEventAndTier = (eventId: string, tierId: string) => {
  const event = MOCK_EVENTS.find((item) => item.id === eventId) || MOCK_EVENTS[0];
  const tierIndex = event.ticketCategories.findIndex((_, index) => mockTierId(event.id, index) === tierId);
  const category = event.ticketCategories[tierIndex >= 0 ? tierIndex : 0];
  return { event, category };
};

const mockPurchasedAsApiTickets = (): ApiTicket[] =>
  MOCK_PURCHASED_TICKETS.map((ticket) => ({
    id: ticket.id,
    event_titre: ticket.eventTitle,
    tiers_lib: ticket.categoryName,
    qr_code_hash: ticket.qr_code_hash || ticket.qrCodeValue,
    statut: ticket.status === 'utilise' ? 'UTILISE' : 'VALIDE',
    destinataire_nom: ticket.recipientName || null,
    destinataire_telephone: ticket.recipientPhone || null,
  }));

type StoredMockOrder = ApiCommandeOrder & {
  payload: ApiCommandePayload | ApiLumicashDemanderOtpPayload;
  polls: number;
  ticketsIssued: boolean;
};

const mockOrders = new Map<string, StoredMockOrder>();
let mockTickets: ApiTicket[] = mockPurchasedAsApiTickets();

const createMockOrder = (
  payload: ApiCommandePayload | ApiLumicashDemanderOtpPayload,
  method: ApiPaymentMethod
): StoredMockOrder => {
  const { event, category } = findMockEventAndTier(payload.event_id, payload.tier_id);
  const quantity = Number(payload.quantite || 1);
  const totalFbu = category.price * quantity;
  const totalSats = Math.max(1, Math.round(totalFbu * 4.415));
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const order: StoredMockOrder = {
    id,
    event_titre: event.title,
    tiers_lib: category.name,
    quantite: quantity,
    montant_fbu: totalFbu.toFixed(2),
    montant_fbu_affiche: totalFbu.toFixed(2),
    montant_sats: method === 'LIGHTNING' ? totalSats : null,
    montant_total_sats: method === 'LIGHTNING' ? totalSats : null,
    moyen_paiement: method,
    statut: 'PENDING',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    date_creation: new Date().toISOString(),
    date_paiement: null,
    statut_reglement_commission: 'EN_ATTENTE',
    tentatives_reglement_commission: 0,
    statut_reglement_organisateur: 'EN_ATTENTE',
    tentatives_reglement_organisateur: 0,
    payload,
    polls: 0,
    ticketsIssued: false,
  };

  mockOrders.set(order.id, order);
  return order;
};

const issueMockTickets = (order: StoredMockOrder) => {
  if (order.ticketsIssued) return;

  const newTickets: ApiTicket[] = Array.from({ length: order.quantite }).map((_, index) => {
    const recipient = order.payload.destinataires?.[index];
    const ticketId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `ticket-${Date.now()}-${index}`;

    return {
      id: ticketId,
      event_titre: order.event_titre,
      tiers_lib: order.tiers_lib,
      qr_code_hash: `${ticketId}.${Math.random().toString(36).slice(2, 18)}`,
      statut: 'VALIDE',
      destinataire_nom: recipient?.nom || null,
      destinataire_telephone: recipient?.telephone || null,
    };
  });

  mockTickets = [...newTickets, ...mockTickets];
  order.ticketsIssued = true;
};

const completeMockOrder = (order: StoredMockOrder) => {
  order.statut = 'SUCCESS';
  order.date_paiement = new Date().toISOString();
  order.statut_reglement_commission = 'REUSSI';
  order.statut_reglement_organisateur = 'REUSSI';
  issueMockTickets(order);
};

async function mockFallback<T>(endpoint: string, options: RequestInit): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const body = readJsonBody(options);

  if (endpoint.includes('/api/auth/demander-otp/')) {
    return {
      message: 'Code OTP envoyé.',
      telephone: body.telephone || '+25779123456',
    } as T;
  }

  if (endpoint.includes('/api/auth/verifier-otp/')) {
    const auth: ApiAuthResponse = {
      access: `mock_access_${Date.now()}`,
      refresh: `mock_refresh_${Date.now()}`,
      user: {
        id: '9f1a2b3c-4d5e-6f70-8192-a1b2c3d4e5f6',
        nom_complet: 'Acheteur IwacuTix',
        email: null,
        telephone: body.telephone || '+25779123456',
        role: 'ACHETEUR',
        statut_compte: 'ACTIF',
        telephone_verifie: true,
        date_creation: new Date().toISOString(),
      },
    };
    setStoredTokens(auth.access, auth.refresh);
    return auth as T;
  }

  if (endpoint.includes('/api/auth/login/')) {
    const isAdmin = String(body.identifiant || '').toLowerCase().includes('admin');
    const auth: ApiAuthResponse = {
      access: `mock_access_${Date.now()}`,
      refresh: `mock_refresh_${Date.now()}`,
      user: {
        id: isAdmin ? '11111111-1111-1111-1111-111111111111' : '88888888-8888-8888-8888-888888888888',
        nom_complet: isAdmin ? 'SuperAdmin IwacuTix' : 'Iwacu Events SA',
        email: String(body.identifiant || 'contact@iwacutix.bi').includes('@') ? body.identifiant : 'contact@iwacutix.bi',
        telephone: '+25770000000',
        role: isAdmin ? 'SUPERADMIN' : 'ORGANISATEUR',
        statut_compte: 'ACTIF',
        telephone_verifie: true,
        date_creation: new Date().toISOString(),
      },
    };
    setStoredTokens(auth.access, auth.refresh);
    return auth as T;
  }

  if (endpoint.includes('/api/auth/me/')) {
    return {
      id: '9f1a2b3c-4d5e-6f70-8192-a1b2c3d4e5f6',
      nom_complet: 'Acheteur IwacuTix',
      email: null,
      telephone: '+25779123456',
      role: 'ACHETEUR',
      statut_compte: 'ACTIF',
      telephone_verifie: true,
      date_creation: new Date().toISOString(),
      url_photo_profil: '/static/img/avatar-defaut.svg',
    } as T;
  }

  const tiersMatch = endpoint.match(/\/api\/public\/evenements\/([^/?]+)\/tiers\//);
  if (tiersMatch) {
    const event = MOCK_EVENTS.find((item) => item.id === tiersMatch[1]) || MOCK_EVENTS[0];
    const detail = mockEventToApi(event, MOCK_EVENTS.indexOf(event), true);
    return makePaginated(detail.tiers || []) as T;
  }

  const detailMatch = endpoint.match(/\/api\/public\/evenements\/([^/?]+)\//);
  if (detailMatch) {
    const event = MOCK_EVENTS.find((item) => item.id === detailMatch[1]) || MOCK_EVENTS[0];
    return mockEventToApi(event, MOCK_EVENTS.indexOf(event), true) as T;
  }

  if (endpoint.startsWith('/api/public/evenements/')) {
    return makePaginated(MOCK_EVENTS.map((event, index) => mockEventToApi(event, index, false))) as T;
  }

  if (endpoint.includes('/api/tickets/commandes/lumicash/demander-otp/') && method === 'POST') {
    const order = createMockOrder(body as ApiLumicashDemanderOtpPayload, 'LUMICASH');
    return {
      order,
      next: '/api/tickets/commandes/lumicash/confirmer/',
      paiement: {
        type: 'lumicash_onramp',
        provider: 'bitlibera',
        montant_fbu: order.montant_fbu,
        instruction: "Un OTP Lumicash vient d'etre envoye par SMS. Confirmez avec l'OTP.",
      },
    } as T;
  }

  if (endpoint.includes('/api/tickets/commandes/lumicash/confirmer/') && method === 'POST') {
    const order = mockOrders.get(body.order_id);
    if (!order) {
      throw { error: 'Commande introuvable ou ne vous appartenant pas.', code: 'not_found' };
    }
    completeMockOrder(order);
    return {
      order,
      message: 'Paiement confirmé et billets émis.',
    } as T;
  }

  if (endpoint === '/api/tickets/commandes/' && method === 'POST') {
    const order = createMockOrder(body as ApiCommandePayload, 'LIGHTNING');
    return {
      order,
      paiement: {
        type: 'lightning',
        provider: 'blink',
        paymentRequest: `lnbc${order.montant_total_sats || 1}n1p${Math.random().toString(36).slice(2, 22)}`,
        paymentHash: Math.random().toString(16).slice(2, 34),
        satoshis: order.montant_total_sats || 1,
        montant_sats: order.montant_total_sats || 1,
        taux_fbu_vers_sats: '0.0044150',
        expires_at: order.expires_at,
      },
    } as T;
  }

  const commandDetailMatch = endpoint.match(/\/api\/tickets\/commandes\/([^/?]+)\//);
  if (commandDetailMatch && !endpoint.includes('/mes/')) {
    const order = mockOrders.get(commandDetailMatch[1]);
    if (!order) throw { error: 'Commande introuvable ou ne vous appartenant pas.', code: 'not_found' };
    order.polls += 1;
    if (order.moyen_paiement === 'LIGHTNING' && order.polls >= 2 && order.statut === 'PENDING') {
      completeMockOrder(order);
    }
    return order as T;
  }

  if (endpoint.startsWith('/api/tickets/commandes/mes/')) {
    return makePaginated(Array.from(mockOrders.values())) as T;
  }

  if (endpoint.startsWith('/api/tickets/mes-billets/')) {
    return makePaginated(mockTickets) as T;
  }

  if (endpoint.includes('/api/tickets/valider/') && method === 'POST') {
    const qr = String(body.qr_code || '').trim();
    const ticket = mockTickets.find((item) => item.qr_code_hash === qr || item.id === qr);
    if (!ticket) {
      return { statut: 'REJETE', error: 'Billet invalide', code: 'ticket_invalide' } as T;
    }
    if (ticket.statut === 'UTILISE') {
      return { statut: 'REJETE', error: 'Deja scanne', code: 'ticket_deja_scanne' } as T;
    }
    ticket.statut = 'UTILISE';
    return { statut: 'ACCEPTE', ticket } as T;
  }

  if (endpoint.includes('/api/organisateurs/mon-profil/')) {
    return {
      id: 'org-mock-1',
      telephone: '+25770000000',
      email: 'contact@iwacutix.bi',
      nom_entreprise: 'Iwacu Events',
      canal_reception: 'LIGHTNING',
      destination_reception: 'org@blink.sv',
      statut_verification: 'VERIFIE',
      commission_taux: '0.0200',
    } as T;
  }

  if (endpoint.includes('/api/admin/parametres-plateforme/')) {
    return {
      id: '11111111-1111-1111-1111-111111111111',
      commission_taux_defaut: '0.0200',
      canal_commission: 'LIGHTNING',
      destination_commission: 'superadmin@blink.sv',
      date_modification: new Date().toISOString(),
    } as T;
  }

  return {} as T;
}

export const api = {
  auth: {
    demanderOtp: (telephone: string) =>
      request<{ message: string; telephone: string }>('/api/auth/demander-otp/', {
        method: 'POST',
        body: JSON.stringify({ telephone }),
      }),

    verifierOtp: (telephone: string, code: string) =>
      request<ApiAuthResponse>('/api/auth/verifier-otp/', {
        method: 'POST',
        body: JSON.stringify({ telephone, code }),
      }),

    login: (identifiant: string, password: string) =>
      request<ApiAuthResponse>('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ identifiant, password }),
      }),

    refreshToken: (refresh: string) =>
      request<{ access: string; refresh: string }>('/api/auth/token/refresh/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      }),

    me: () => request<ApiUser>('/api/auth/me/'),

    updatePhotoProfil: (data: FormData) =>
      request<ApiUser>('/api/auth/me/photo-profil/', {
        method: 'PATCH',
        body: data,
      }),

    deletePhotoProfil: () =>
      request<ApiUser>('/api/auth/me/photo-profil/', {
        method: 'DELETE',
      }),

    logout: clearStoredTokens,
  },

  organisateurs: {
    getMonProfil: () => request<any>('/api/organisateurs/mon-profil/'),
    updateMonProfil: (data: FormData | Record<string, unknown>) =>
      request<any>('/api/organisateurs/mon-profil/', {
        method: 'PUT',
        body: isFormData(data) ? data : JSON.stringify(data),
      }),
    getStats: () => request<any>('/api/organisateurs/mon-profil/stats/'),
    soumettreDemande: (data: FormData) =>
      request<any>('/api/organisateurs/demandes/', {
        method: 'POST',
        body: data,
      }),
    getMesDemandes: () => request<any[]>('/api/organisateurs/demandes/mes/'),
    getScanneurs: (organisateurId: string, eventId?: string) => {
      const query = eventId ? `?event_id=${encodeURIComponent(eventId)}` : '';
      return request<PaginatedResponse<ScanneurAssignment>>(`/api/organisateurs/${organisateurId}/scanneurs/${query}`);
    },
    assignerScanneur: (organisateurId: string, payload: { telephone_ou_user_id: string; event_id: string }) =>
      request<ScanneurAssignment>(`/api/organisateurs/${organisateurId}/scanneurs/assigner/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    retirerScanneur: (organisateurId: string, assignmentId: string) =>
      request<void>(`/api/organisateurs/${organisateurId}/scanneurs/${assignmentId}/`, {
        method: 'DELETE',
      }),
  },

  public: {
    getEvenements: (params?: {
      categorie?: string;
      ville?: string;
      date_min?: string;
      date_max?: string;
      q?: string;
      page?: number;
    }) => {
      const search = new URLSearchParams();
      if (params?.categorie && params.categorie !== 'Tous') search.set('categorie', params.categorie);
      if (params?.ville) search.set('ville', params.ville);
      if (params?.date_min) search.set('date_min', params.date_min);
      if (params?.date_max) search.set('date_max', params.date_max);
      if (params?.q) search.set('q', params.q);
      if (params?.page) search.set('page', String(params.page));
      const query = search.toString();
      return request<PaginatedResponse<ApiEvenementPublic>>(`/api/public/evenements/${query ? `?${query}` : ''}`);
    },
    getEvenement: (id: string) => request<ApiEvenementPublic>(`/api/public/evenements/${id}/`),
    getEvenementTiers: (id: string) => request<PaginatedResponse<ApiTier>>(`/api/public/evenements/${id}/tiers/`),
  },

  events: {
    getMyEvents: (page?: number) => request<PaginatedResponse<any>>(pageUrl('/api/organisateurs/events/', page)),
    createEvent: (data: FormData | Record<string, unknown>) =>
      request<any>('/api/organisateurs/events/', {
        method: 'POST',
        body: isFormData(data) ? data : JSON.stringify(data),
      }),
    getEvent: (id: string) => request<any>(`/api/organisateurs/events/${id}/`),
    updateEvent: (id: string, data: FormData | Record<string, unknown>) =>
      request<any>(`/api/organisateurs/events/${id}/`, {
        method: 'PATCH',
        body: isFormData(data) ? data : JSON.stringify(data),
      }),
    deleteEvent: (id: string) =>
      request<void>(`/api/organisateurs/events/${id}/`, {
        method: 'DELETE',
      }),
    getTiers: (eventId: string) => request<PaginatedResponse<ApiTier>>(`/api/organisateurs/events/${eventId}/tiers/`),
    createTier: (eventId: string, data: Record<string, unknown>) =>
      request<ApiTier>(`/api/organisateurs/events/${eventId}/tiers/`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMedias: (eventId: string) =>
      request<PaginatedResponse<ApiMedia>>(`/api/organisateurs/events/${eventId}/medias/`),
    addMedia: (eventId: string, data: FormData | Record<string, unknown>) =>
      request<ApiMedia>(`/api/organisateurs/events/${eventId}/medias/`, {
        method: 'POST',
        body: isFormData(data) ? data : JSON.stringify(data),
      }),
    deleteMedia: (eventId: string, mediaId: string) =>
      request<void>(`/api/organisateurs/events/${eventId}/medias/${mediaId}/`, {
        method: 'DELETE',
      }),
    reordonnerMedias: (eventId: string, mediaIds: string[]) =>
      request<{ detail: string }>(`/api/organisateurs/events/${eventId}/medias/reordonner/`, {
        method: 'PATCH',
        body: JSON.stringify({ media_ids: mediaIds }),
      }),
    getScanLogs: (eventId: string, statutValidation?: 'ACCEPTE' | 'REJETE') => {
      const query = statutValidation ? `?statut_validation=${statutValidation}` : '';
      return request<any>(`/api/organisateurs/events/${eventId}/logs-scan/${query}`);
    },
  },

  tickets: {
    creerCommande: (payload: ApiCommandePayload & { moyen_paiement: 'LIGHTNING' }) =>
      request<ApiCommandeResponse>('/api/tickets/commandes/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    demanderOtpLumicash: (payload: ApiLumicashDemanderOtpPayload) =>
      request<ApiLumicashDemanderOtpResponse>('/api/tickets/commandes/lumicash/demander-otp/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    confirmerLumicash: (orderId: string, otp: string) =>
      request<ApiLumicashConfirmerResponse>('/api/tickets/commandes/lumicash/confirmer/', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, otp }),
      }),

    getCommandes: (page?: number) =>
      request<PaginatedResponse<ApiCommandeOrder>>(pageUrl('/api/tickets/commandes/mes/', page)),

    getCommande: (id: string) => request<ApiCommandeOrder>(`/api/tickets/commandes/${id}/`),

    getMesBillets: (page?: number) => request<PaginatedResponse<ApiTicket>>(pageUrl('/api/tickets/mes-billets/', page)),

    valider: (qr_code: string) =>
      request<ApiScanResult>('/api/tickets/valider/', {
        method: 'POST',
        body: JSON.stringify({ qr_code }),
      }),
  },

  admin: {
    getParametresPlateforme: () => request<ParametrePlateforme>('/api/admin/parametres-plateforme/'),
    updateParametresPlateforme: (data: Partial<ParametrePlateforme>) =>
      request<ParametrePlateforme>('/api/admin/parametres-plateforme/', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getStats: () => request<any>('/api/admin/stats/'),
    getHistorique: (params?: { order?: string; type_evenement?: string; canal?: string; reference_externe?: string; page?: number }) => {
      const search = new URLSearchParams();
      if (params?.order) search.set('order', params.order);
      if (params?.type_evenement) search.set('type_evenement', params.type_evenement);
      if (params?.canal) search.set('canal', params.canal);
      if (params?.reference_externe) search.set('reference_externe', params.reference_externe);
      if (params?.page) search.set('page', String(params.page));
      const query = search.toString();
      return request<any>(`/api/admin/historique/${query ? `?${query}` : ''}`);
    },
    getDemandesOrganisateurs: (params?: { statut?: string; user?: string }) => {
      const search = new URLSearchParams();
      if (params?.statut) search.set('statut', params.statut);
      if (params?.user) search.set('user', params.user);
      const query = search.toString();
      return request<any>(`/api/admin/organisateurs/demandes/${query ? `?${query}` : ''}`);
    },
    deciderDemandeOrganisateur: (id: string, data: { statut: 'APPROUVE' | 'REJETE'; motif_rejet?: string }) =>
      request<any>(`/api/admin/organisateurs/demandes/${id}/decider/`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
