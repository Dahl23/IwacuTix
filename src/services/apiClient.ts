import { 
  ApiAuthResponse, 
  ApiCommandePayload, 
  ApiCommandeResponse, 
  ApiCommandeOrder,
  ApiErrorResponse, 
  ApiEvenementPublic, 
  ApiScanResult, 
  ApiTicket, 
  ApiTier, 
  ApiMedia, 
  PaginatedResponse,
  PortefeuilleOrganisateur,
  ParametrePlateforme,
  Versement,
  ScanneurAssignment
} from '../types';
import { MOCK_EVENTS } from '../data';

// Configuration de l'URL de base selon la documentation
// URL de base développement : http://127.0.0.1:8000
// Remplacer selon VITE_API_BASE_URL en production
const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
export const API_BASE_URL = metaEnv?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const ACCESS_TOKEN_KEY = 'iwacutix_access_token';
const REFRESH_TOKEN_KEY = 'iwacutix_refresh_token';

// État de connexion détecté
let isBackendLive: boolean | null = null;

export const getApiConnectionStatus = (): boolean | null => isBackendLive;

// Gestion du stockage des jetons JWT
export const getStoredAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getStoredRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setStoredTokens = (access: string, refresh: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};

export const clearStoredTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Variable pour gérer le rafraîchissement "single-flight" des tokens
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

/**
 * Calculateur HMAC-SHA256 en Web Crypto API pour simuler les webhooks Mobile Money en dev
 */
export async function computeHmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await window.crypto.subtle.sign('HMAC', key, enc.encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Client HTTP centralisé avec interception JWT et fallback résilient
 */
async function request<T>(
  endpoint: string, 
  options: RequestInit = {}, 
  isRetry = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  // Injection du Bearer token si présent
  const accessToken = getStoredAccessToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  // Content-Type par défaut si body JSON
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    isBackendLive = true;

    // Gestion du 401 JWT et rafraîchissement ROTATE_REFRESH_TOKENS
    if (response.status === 401 && !isRetry && !endpoint.includes('/auth/login/') && !endpoint.includes('/auth/verifier-otp/')) {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh: refreshToken }),
            });

            if (refreshRes.ok) {
              const data = await refreshRes.json();
              setStoredTokens(data.access, data.refresh);
              onTokenRefreshed(data.access);
              isRefreshing = false;
              // Rejouer la requête d'origine avec le nouveau token
              return request<T>(endpoint, options, true);
            } else {
              clearStoredTokens();
              isRefreshing = false;
            }
          } catch {
            isRefreshing = false;
            clearStoredTokens();
          }
        } else {
          // Attendre la résolution du single-flight en cours
          return new Promise<T>((resolve, reject) => {
            subscribeTokenRefresh((newToken) => {
              const retryHeaders = new Headers(options.headers || {});
              retryHeaders.set('Authorization', `Bearer ${newToken}`);
              request<T>(endpoint, { ...options, headers: retryHeaders }, true)
                .then(resolve)
                .catch(reject);
            });
          });
        }
      }
    }

    if (!response.ok) {
      let errorBody: any;
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

    return await response.json();
  } catch (err: any) {
    // Si le serveur local Django (127.0.0.1:8000) n'est pas démarré, fallback gracieux
    if (err instanceof TypeError && err.message.includes('fetch')) {
      isBackendLive = false;
      console.warn(`[IwacuTix API] Backend ${API_BASE_URL} non joignable. Utilisation du fallback simulé conforme API_FRONTEND.md`);
      return mockFallback<T>(endpoint, options);
    }
    throw err;
  }
}

/**
 * Fallback haute-fidélité pour tester et visualiser l'app dans le navigateur
 * lorsque l'environnement local Django tourne sur une machine séparée.
 */
function mockFallback<T>(endpoint: string, options: RequestInit): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

  // 1. Authentification
  if (endpoint.includes('/api/auth/demander-otp/')) {
    return Promise.resolve({
      message: 'Code OTP envoyé.',
      telephone: body.telephone || '+25779123456',
    } as unknown as T);
  }

  if (endpoint.includes('/api/auth/verifier-otp/')) {
    const mockAuth: ApiAuthResponse = {
      access: 'mock_jwt_access_token_' + Date.now(),
      refresh: 'mock_jwt_refresh_token_' + Date.now(),
      user: {
        id: '9f1a2b3c-4d5e-6f70-8192-a1b2c3d4e5f6',
        nom_complet: 'Jean Ntakirutimana (Client OTP)',
        email: null,
        telephone: body.telephone || '+25779123456',
        role: 'ACHETEUR',
        statut_compte: 'ACTIF',
        telephone_verifie: true,
        date_creation: new Date().toISOString(),
      },
    };
    setStoredTokens(mockAuth.access, mockAuth.refresh);
    return Promise.resolve(mockAuth as unknown as T);
  }

  if (endpoint.includes('/api/auth/login/')) {
    const isSuperAdmin = body.identifiant?.toLowerCase().includes('admin');
    const mockAuth: ApiAuthResponse = {
      access: 'mock_jwt_access_token_' + Date.now(),
      refresh: 'mock_jwt_refresh_token_' + Date.now(),
      user: {
        id: isSuperAdmin ? '11111111-1111-1111-1111-111111111111' : '88888888-8888-8888-8888-888888888888',
        nom_complet: isSuperAdmin ? 'SuperAdmin HQ IwacuTix' : 'Iwacu Events SA (Organisateur)',
        email: body.identifiant?.includes('@') ? body.identifiant : 'contact@iwacutix.bi',
        telephone: '+25770000000',
        role: isSuperAdmin ? 'SUPERADMIN' : 'ORGANISATEUR',
        statut_compte: 'ACTIF',
        telephone_verifie: true,
        date_creation: new Date().toISOString(),
      },
    };
    setStoredTokens(mockAuth.access, mockAuth.refresh);
    return Promise.resolve(mockAuth as unknown as T);
  }

  // 2. Marketplace publique des événements
  if (endpoint.startsWith('/api/public/evenements/')) {
    const idMatch = endpoint.match(/\/api\/public\/evenements\/([a-zA-Z0-9_-]+)\//);
    if (idMatch) {
      const evtId = idMatch[1];
      const found = MOCK_EVENTS.find((e) => e.id === evtId) || MOCK_EVENTS[0];
      const detailed: ApiEvenementPublic = {
        id: found.id,
        titre: found.title,
        description: found.description,
        affiche: found.imageUrl,
        lieu: found.location,
        ville: 'Bujumbura',
        date_debut: '2026-12-01T18:00:00Z',
        date_fin: null,
        categorie: (found.category.toUpperCase() as any) || 'CONCERT',
        organisateur: found.organisateur,
        tiers: found.ticketCategories.map((tc, idx) => ({
          id: `tier-uuid-${idx + 1}`,
          nom: tc.name,
          prix_fbu: tc.price.toFixed(2),
          stock_disponible: tc.available,
          stock_total: tc.available + 50,
          moyens_paiement_acceptes: tc.moyens_paiement_acceptes || ['LUMICASH', 'ECOCASH', 'LIGHTNING'],
        })),
        medias: [
          {
            id: 'media-yt-demo',
            type_media: 'VIDEO',
            fichier: null,
            url_externe: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            ordre: 0,
            date_ajout: '2026-09-20T09:00:00Z',
          },
        ],
      };
      return Promise.resolve(detailed as unknown as T);
    }

    // Liste paginée
    const listResponse: PaginatedResponse<ApiEvenementPublic> = {
      count: MOCK_EVENTS.length,
      next: null,
      previous: null,
      results: MOCK_EVENTS.map((e) => ({
        id: e.id,
        titre: e.title,
        description: e.description,
        affiche: e.imageUrl,
        lieu: e.location,
        ville: 'Bujumbura',
        date_debut: '2026-12-01T18:00:00Z',
        date_fin: null,
        categorie: (e.category.toUpperCase() as any) || 'CONCERT',
        organisateur: e.organisateur,
      })),
    };
    return Promise.resolve(listResponse as unknown as T);
  }

  // 3. Commandes & Billets
  if (endpoint.includes('/api/tickets/commandes/') && method === 'POST') {
    const isLightning = body.moyen_paiement === 'LIGHTNING';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes de réservation
    const orderId = 'order-' + Math.random().toString(36).substring(2, 9);

    const mockResponse: ApiCommandeResponse = {
      order: {
        id: orderId,
        event_titre: 'Concert & Match IwacuTix',
        tiers_lib: 'Tribune Standard',
        quantite: body.quantite || 1,
        montant_fbu: (30000 * (body.quantite || 1)).toFixed(2),
        montant_sats: isLightning ? 132450 * (body.quantite || 1) : null,
        moyen_paiement: body.moyen_paiement || 'LUMICASH',
        statut: 'PENDING',
        expires_at: expiresAt,
        date_creation: new Date().toISOString(),
      },
      paiement: isLightning
        ? {
            type: 'lightning',
            provider: 'blink',
            paymentRequest: 'lnbc132450n1pj' + Math.random().toString(36).substring(2, 20),
            paymentHash: 'hash-' + Math.random().toString(36).substring(2, 10),
            satoshis: 132450 * (body.quantite || 1),
            montant_sats: 132450 * (body.quantite || 1),
            taux_fbu_vers_sats: '0.0044150',
            expires_at: expiresAt,
          }
        : {
            type: 'mobile_money',
            provider: body.moyen_paiement || 'LUMICASH',
            reference: `${body.moyen_paiement || 'LUMICASH'}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            montant_fbu: (30000 * (body.quantite || 1)).toFixed(2),
            telephone_client: '+25779123456',
            expires_at: expiresAt,
            instruction: 'Confirmez le paiement sur votre téléphone via USSD.',
          },
    };
    return Promise.resolve(mockResponse as unknown as T);
  }

  // Validation scan billet
  if (endpoint.includes('/api/tickets/valider/')) {
    const qr = body.qr_code || '';
    if (qr.includes('utilise')) {
      const res: ApiScanResult = {
        statut: 'REJETE',
        error: 'Ce billet a déjà été utilisé à la porte.',
        code: 'ticket_deja_scanne',
      };
      return Promise.resolve(res as unknown as T);
    }
    const res: ApiScanResult = {
      statut: 'ACCEPTE',
      ticket: {
        id: 'BTK-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        event_titre: 'Événement IwacuTix Officiel',
        tiers_lib: 'Place Validée',
        qr_code_hash: qr,
        statut: 'VALIDE',
        destinataire_nom: null,
        destinataire_telephone: null,
      },
    };
    return Promise.resolve(res as unknown as T);
  }

  return Promise.resolve({} as T);
}

// ---------------------------------------------------------------------------
// SERVICE API COMPLET ET EXPORTABLE
// ---------------------------------------------------------------------------

export const api = {
  // 1. Authentification (Section 1)
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

    me: () => request<ApiAuthResponse['user']>('/api/auth/me/'),
    logout: () => clearStoredTokens(),
  },

  // 2. Organisateurs (Section 2)
  organisateurs: {
    getMonProfil: () => request<any>('/api/organisateurs/mon-profil/'),
    updateMonProfil: (data: any) =>
      request<any>('/api/organisateurs/mon-profil/', {
        method: 'PUT',
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),
    getMonPortefeuille: () => request<PortefeuilleOrganisateur>('/api/organisateurs/mon-portefeuille/'),
    getScanneurs: (organisateurId: string, eventId?: string) =>
      request<PaginatedResponse<ScanneurAssignment>>(
        `/api/organisateurs/${organisateurId}/scanneurs/${eventId ? `?event_id=${eventId}` : ''}`
      ),
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

  // 3. Événements (Section 3)
  public: {
    getEvenements: (params?: { categorie?: string; ville?: string; date_min?: string; date_max?: string; q?: string; page?: number }) => {
      const search = new URLSearchParams();
      if (params?.categorie) search.set('categorie', params.categorie);
      if (params?.ville) search.set('ville', params.ville);
      if (params?.date_min) search.set('date_min', params.date_min);
      if (params?.date_max) search.set('date_max', params.date_max);
      if (params?.q) search.set('q', params.q);
      if (params?.page) search.set('page', params.page.toString());
      const query = search.toString();
      return request<PaginatedResponse<ApiEvenementPublic>>(`/api/public/evenements/${query ? `?${query}` : ''}`);
    },
    getEvenement: (id: string) => request<ApiEvenementPublic>(`/api/public/evenements/${id}/`),
    getEvenementTiers: (id: string) => request<PaginatedResponse<ApiTier>>(`/api/public/evenements/${id}/tiers/`),
  },

  events: {
    getMyEvents: () => request<PaginatedResponse<any>>('/api/organisateurs/events/'),
    createEvent: (data: any) =>
      request<any>('/api/organisateurs/events/', {
        method: 'POST',
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),
    getEvent: (id: string) => request<any>(`/api/organisateurs/events/${id}/`),
    updateEvent: (id: string, data: any) =>
      request<any>(`/api/organisateurs/events/${id}/`, {
        method: 'PATCH',
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),
    deleteEvent: (id: string) =>
      request<void>(`/api/organisateurs/events/${id}/`, {
        method: 'DELETE',
      }),
    getTiers: (eventId: string) => request<ApiTier[]>(`/api/organisateurs/events/${eventId}/tiers/`),
    createTier: (eventId: string, data: any) =>
      request<ApiTier>(`/api/organisateurs/events/${eventId}/tiers/`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMedias: (eventId: string) => request<PaginatedResponse<ApiMedia>>(`/api/organisateurs/events/${eventId}/medias/`),
    addMedia: (eventId: string, data: any) =>
      request<ApiMedia>(`/api/organisateurs/events/${eventId}/medias/`, {
        method: 'POST',
        body: data instanceof FormData ? data : JSON.stringify(data),
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
  },

  // 4. Commandes & Billets (Section 5)
  tickets: {
    creerCommande: (payload: ApiCommandePayload) =>
      request<ApiCommandeResponse>('/api/tickets/commandes/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    getCommandes: (page?: number) =>
      request<PaginatedResponse<ApiCommandeOrder>>(`/api/tickets/commandes/${page ? `?page=${page}` : ''}`),

    getMesBillets: (page?: number) =>
      request<PaginatedResponse<ApiTicket>>(`/api/tickets/mes-billets/${page ? `?page=${page}` : ''}`),

    valider: (qr_code: string) =>
      request<ApiScanResult>('/api/tickets/valider/', {
        method: 'POST',
        body: JSON.stringify({ qr_code }),
      }),
  },

  // 5. Paiements & Webhooks dev (Section 6)
  paiements: {
    simulerWebhookMobileMoney: async (
      provider: 'lumicash' | 'ecocash' | 'bancobu' | 'ihela',
      reference: string,
      statut: 'SUCCESS' | 'ECHEC' = 'SUCCESS'
    ) => {
      const secret = `${provider.toUpperCase()}-dev-secret`;
      const body = JSON.stringify({ reference, statut });
      const signature = await computeHmacSha256Hex(secret, body);

      return request<{ message?: string }>(`/api/paiements/webhooks/${provider}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IwacuTix-Signature': signature,
        },
        body,
      });
    },
  },

  // 6. SuperAdmin (Section 8)
  admin: {
    getParametresPlateforme: () => request<ParametrePlateforme>('/api/admin/parametres-plateforme/'),
    updateParametresPlateforme: (data: Partial<ParametrePlateforme>) =>
      request<ParametrePlateforme>('/api/admin/parametres-plateforme/', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getVersements: (params?: { statut?: string; canal?: string; organisateur?: string }) => {
      const search = new URLSearchParams();
      if (params?.statut) search.set('statut', params.statut);
      if (params?.canal) search.set('canal', params.canal);
      if (params?.organisateur) search.set('organisateur', params.organisateur);
      const query = search.toString();
      return request<PaginatedResponse<Versement>>(`/api/admin/versements/${query ? `?${query}` : ''}`);
    },
  },
};
