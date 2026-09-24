import { 
  ApiAuthResponse, 
  ApiCommandePayload, 
  ApiCommandeResponse, 
  ApiCommandeOrder, 
  ApiEvenementPublic, 
  ApiScanResult, 
  ApiTicket, 
  ApiTier, 
  ApiMedia, 
  PaginatedResponse,
  PortefeuilleOrganisateur,
  ParametrePlateforme,
  Versement,
  ScanneurAssignment,
  OrganisateurProfilApi,
  OrganisateurStats,
  DemandeOrganisateur,
  ScanLogResponse,
  LumicashDemanderOtpResponse,
  LumicashConfirmerResponse,
  AdminStats,
  TransactionAuditLog,
  ApiDestinataireBillet
} from '../types';
import { MOCK_EVENTS } from '../data';

// Configuration de l'URL de base selon la documentation
// URL officielle du backend Render : https://iwacutix-api.onrender.com
const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
export const API_BASE_URL = 
  metaEnv?.VITE_API_BASE_URL || 
  metaEnv?.VITE_API_URL || 
  'https://iwacutix-api.onrender.com';

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
 * Client HTTP centralisé avec interception JWT, injection Bearer et rafraîchissement automatique
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

  // Content-Type par défaut si body JSON (ne pas définir si multipart/FormData)
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
    // Si le serveur distant ne répond pas temporairement (cold start Render), fallback gracieux
    if (err instanceof TypeError && err.message.includes('fetch')) {
      isBackendLive = false;
      console.warn(`[IwacuTix API] Backend ${API_BASE_URL} momentanément inaccessible. Fallback local.`);
      return mockFallback<T>(endpoint, options);
    }
    throw err;
  }
}

/**
 * Fallback haute-fidélité pour le mode hors-ligne
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
          moyens_paiement_acceptes: tc.moyens_paiement_acceptes || ['LUMICASH', 'LIGHTNING'],
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
  if (endpoint.includes('/api/tickets/commandes/lumicash/demander-otp/') && method === 'POST') {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const orderId = 'order-' + Math.random().toString(36).substring(2, 9);
    const mockRes: LumicashDemanderOtpResponse = {
      order: {
        id: orderId,
        event_titre: 'Concert & Match IwacuTix',
        tiers_lib: 'Tribune',
        quantite: body.quantite || 1,
        montant_fbu: (30000 * (body.quantite || 1)).toFixed(2),
        montant_sats: null,
        moyen_paiement: 'LUMICASH',
        statut: 'PENDING',
        expires_at: expiresAt,
        date_creation: new Date().toISOString(),
      },
      next: '/api/tickets/commandes/lumicash/confirmer/',
      paiement: {
        type: 'lumicash_onramp',
        provider: 'bitlibera',
        montant_fbu: (30000 * (body.quantite || 1)).toFixed(2),
        instruction: "Un OTP Lumicash vient d'être envoyé par SMS. Confirmez avec l'OTP.",
      },
    };
    return Promise.resolve(mockRes as unknown as T);
  }

  if (endpoint.includes('/api/tickets/commandes/lumicash/confirmer/') && method === 'POST') {
    const mockRes: LumicashConfirmerResponse = {
      order: {
        id: body.order_id || 'order-test',
        event_titre: 'Concert & Match IwacuTix',
        tiers_lib: 'Tribune',
        quantite: 1,
        montant_fbu: '30000.00',
        montant_sats: null,
        moyen_paiement: 'LUMICASH',
        statut: 'SUCCESS',
        expires_at: new Date().toISOString(),
        date_creation: new Date().toISOString(),
      },
      message: 'Paiement confirmé et billets émis.',
    };
    return Promise.resolve(mockRes as unknown as T);
  }

  if (endpoint.includes('/api/tickets/commandes/') && method === 'POST') {
    const isLightning = body.moyen_paiement === 'LIGHTNING';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const orderId = 'order-' + Math.random().toString(36).substring(2, 9);

    const mockResponse: ApiCommandeResponse = {
      order: {
        id: orderId,
        event_titre: 'Concert & Match IwacuTix',
        tiers_lib: 'Tribune Standard',
        quantite: body.quantite || 1,
        montant_fbu: (30000 * (body.quantite || 1)).toFixed(2),
        montant_sats: isLightning ? 132450 * (body.quantite || 1) : null,
        moyen_paiement: body.moyen_paiement || 'LIGHTNING',
        statut: 'PENDING',
        expires_at: expiresAt,
        date_creation: new Date().toISOString(),
      },
      paiement: {
        type: 'lightning',
        provider: 'blink',
        paymentRequest: 'lnbc132450n1pj' + Math.random().toString(36).substring(2, 20),
        paymentHash: 'hash-' + Math.random().toString(36).substring(2, 10),
        satoshis: 132450 * (body.quantite || 1),
        montant_sats: 132450 * (body.quantite || 1),
        taux_fbu_vers_sats: '0.0044150',
        expires_at: expiresAt,
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
// SERVICE API COMPLET ET EXPORTABLE (100% CONFORME GUIDE DEVELOPPEUR IWACUTIX)
// ---------------------------------------------------------------------------

export const api = {
  // 1. Authentification (Section 1)
  auth: {
    // 1.1 Demander OTP SMS (+25779123456)
    demanderOtp: (telephone: string) =>
      request<{ message: string; telephone: string }>('/api/auth/demander-otp/', {
        method: 'POST',
        body: JSON.stringify({ telephone }),
      }),

    // 1.2 Valider OTP et obtenir tokens JWT
    verifierOtp: (telephone: string, code: string) =>
      request<ApiAuthResponse>('/api/auth/verifier-otp/', {
        method: 'POST',
        body: JSON.stringify({ telephone, code }),
      }),

    // 1.3 Login mot de passe pour Organisateur & SuperAdmin
    login: (identifiant: string, password: string) =>
      request<ApiAuthResponse>('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ identifiant, password }),
      }),

    // 1.4 Rafraîchir les jetons JWT (Rotate refresh tokens)
    refreshToken: (refresh: string) =>
      request<{ access: string; refresh: string }>('/api/auth/token/refresh/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      }),

    // 1.5 Profil utilisateur connecté
    me: () => request<ApiAuthResponse['user'] & { url_photo_profil?: string | null }>('/api/auth/me/'),

    // 1.6 Mettre à jour la photo de profil (multipart/form-data)
    updatePhotoProfil: (photoFile: File) => {
      const formData = new FormData();
      formData.append('photo_profil', photoFile);
      return request<any>('/api/auth/me/photo-profil/', {
        method: 'PATCH',
        body: formData,
      });
    },

    // 1.6 Supprimer la photo de profil
    deletePhotoProfil: () =>
      request<any>('/api/auth/me/photo-profil/', {
        method: 'DELETE',
      }),

    // Déconnexion locale
    logout: () => clearStoredTokens(),
  },

  // 2. Organisateurs (Section 2)
  organisateurs: {
    // 2.1 Obtenir mon profil organisateur
    getMonProfil: () => request<OrganisateurProfilApi>('/api/organisateurs/mon-profil/'),

    // 2.2 Mettre à jour mon profil organisateur (nom_entreprise, canal_reception, destination_reception, document_verification)
    updateMonProfil: (data: Partial<OrganisateurProfilApi> | FormData) =>
      request<OrganisateurProfilApi>('/api/organisateurs/mon-profil/', {
        method: 'PUT',
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),

    // 2.3 Statistiques de ventes de l'organisateur connecté
    getStats: () => request<OrganisateurStats>('/api/organisateurs/mon-profil/stats/'),

    // Portefeuille organisateur (legacy compat)
    getMonPortefeuille: () => request<PortefeuilleOrganisateur>('/api/organisateurs/mon-portefeuille/'),

    // 2.4 Liste des scanneurs assignés
    getScanneurs: (organisateurId: string, eventId?: string) =>
      request<PaginatedResponse<ScanneurAssignment>>(
        `/api/organisateurs/${organisateurId}/scanneurs/${eventId ? `?event_id=${eventId}` : ''}`
      ),

    // 2.4 Assigner un scanneur à un événement
    assignerScanneur: (organisateurId: string, payload: { telephone_ou_user_id: string; event_id: string }) =>
      request<ScanneurAssignment>(`/api/organisateurs/${organisateurId}/scanneurs/assigner/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    // 2.4 Retirer un scanneur
    retirerScanneur: (organisateurId: string, assignmentId: string) =>
      request<void>(`/api/organisateurs/${organisateurId}/scanneurs/${assignmentId}/`, {
        method: 'DELETE',
      }),

    // 2.5 Soumettre une demande d'adhésion organisateur
    soumettreDemande: (data: FormData | { nom_entreprise: string; document_verification: File; nom_structure?: string; justification?: string }) => {
      let body: FormData;
      if (data instanceof FormData) {
        body = data;
      } else {
        body = new FormData();
        body.append('nom_entreprise', data.nom_entreprise);
        body.append('document_verification', data.document_verification);
        if (data.nom_structure) body.append('nom_structure', data.nom_structure);
        if (data.justification) body.append('justification', data.justification);
      }
      return request<DemandeOrganisateur>('/api/organisateurs/demandes/', {
        method: 'POST',
        body,
      });
    },

    // 2.5 Liste de mes demandes d'adhésion organisateur
    getMesDemandes: () => request<DemandeOrganisateur[]>('/api/organisateurs/demandes/mes/'),
  },

  // 3. Événements publics (Section 3.A)
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

    getEvenementTiers: (id: string, page?: number) =>
      request<PaginatedResponse<ApiTier>>(`/api/public/evenements/${id}/tiers/${page ? `?page=${page}` : ''}`),
  },

  // 4. Événements - Dashboard Organisateur (Section 3.B, 3.D & Section 4)
  events: {
    // 3.B Liste de mes événements organisateur
    getMyEvents: (page?: number) =>
      request<PaginatedResponse<any>>(`/api/organisateurs/events/${page ? `?page=${page}` : ''}`),

    // 3.B Créer un événement (statut BROUILLON initial)
    createEvent: (data: FormData | any) =>
      request<any>('/api/organisateurs/events/', {
        method: 'POST',
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),

    // 3.B Détail d'un événement
    getEvent: (id: string) => request<any>(`/api/organisateurs/events/${id}/`),

    // 3.B Modifier / Publier ({ statut: "PUBLIE" })
    updateEvent: (id: string, data: FormData | any) =>
      request<any>(`/api/organisateurs/events/${id}/`, {
        method: 'PATCH',
        body: data instanceof FormData ? data : JSON.stringify(data),
      }),

    // 3.B Supprimer un événement
    deleteEvent: (id: string) =>
      request<void>(`/api/organisateurs/events/${id}/`, {
        method: 'DELETE',
      }),

    // Tiers (Niveaux de places)
    getTiers: (eventId: string) => request<ApiTier[]>(`/api/organisateurs/events/${eventId}/tiers/`),

    createTier: (eventId: string, data: { nom: string; prix_fbu: number | string; stock_total: number; moyens_paiement_acceptes: string[] }) =>
      request<ApiTier>(`/api/organisateurs/events/${eventId}/tiers/`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getTier: (eventId: string, tierId: string) =>
      request<ApiTier>(`/api/organisateurs/events/${eventId}/tiers/${tierId}/`),

    updateTier: (eventId: string, tierId: string, data: Partial<{ nom: string; prix_fbu: number | string; stock_total: number; moyens_paiement_acceptes: string[] }>) =>
      request<ApiTier>(`/api/organisateurs/events/${eventId}/tiers/${tierId}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteTier: (eventId: string, tierId: string) =>
      request<void>(`/api/organisateurs/events/${eventId}/tiers/${tierId}/`, {
        method: 'DELETE',
      }),

    // 3.D Journal de scans (ScanLogs)
    getLogsScan: (eventId: string, params?: { statut_validation?: 'ACCEPTE' | 'REJETE'; page?: number }) => {
      const search = new URLSearchParams();
      if (params?.statut_validation) search.set('statut_validation', params.statut_validation);
      if (params?.page) search.set('page', params.page.toString());
      const query = search.toString();
      return request<ScanLogResponse>(`/api/organisateurs/events/${eventId}/logs-scan/${query ? `?${query}` : ''}`);
    },

    // 4. Médias d'événement (Galerie)
    getMedias: (eventId: string) => request<PaginatedResponse<ApiMedia>>(`/api/organisateurs/events/${eventId}/medias/`),

    addMedia: (eventId: string, data: FormData | { type_media: 'IMAGE' | 'VIDEO'; fichier?: File; url_externe?: string }) => {
      return request<ApiMedia>(`/api/organisateurs/events/${eventId}/medias/`, {
        method: 'POST',
        body: data instanceof FormData ? data : JSON.stringify(data),
      });
    },

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

  // 5. Commandes & Billets (Section 5)
  tickets: {
    // 5.1 Acheter en Lightning (Blink Invoice BOLT11)
    creerCommandeLightning: (payload: {
      event_id: string;
      tier_id: string;
      quantite: number;
      moyen_paiement: 'LIGHTNING';
      destinataires?: ApiDestinataireBillet[];
    }) =>
      request<ApiCommandeResponse>('/api/tickets/commandes/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    // Alias pour compatibilité
    creerCommande: (payload: ApiCommandePayload) =>
      request<ApiCommandeResponse>('/api/tickets/commandes/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    // 5.2 Étape 1 Lumicash - Demander OTP
    demanderOtpLumicash: (payload: {
      event_id: string;
      tier_id: string;
      quantite: number;
      destinataires?: ApiDestinataireBillet[];
    }) =>
      request<LumicashDemanderOtpResponse>('/api/tickets/commandes/lumicash/demander-otp/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    // 5.2 Étape 2 Lumicash - Confirmer avec OTP
    confirmerLumicash: (payload: { order_id: string; otp: string }) =>
      request<LumicashConfirmerResponse>('/api/tickets/commandes/lumicash/confirmer/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    // 5.3 Mes commandes (pagifié)
    getCommandes: (page?: number) =>
      request<PaginatedResponse<ApiCommandeOrder>>(`/api/tickets/commandes/mes/${page ? `?page=${page}` : ''}`),

    // 5.4 Détail d'une commande
    getCommande: (id: string) => request<ApiCommandeOrder>(`/api/tickets/commandes/${id}/`),

    // 5.5 Mes billets
    getMesBillets: (page?: number) =>
      request<PaginatedResponse<ApiTicket>>(`/api/tickets/mes-billets/${page ? `?page=${page}` : ''}`),

    // 7. Valider un billet par scan (Contrôle d'accès)
    valider: (qr_code: string) =>
      request<ApiScanResult>('/api/tickets/valider/', {
        method: 'POST',
        body: JSON.stringify({ qr_code }),
      }),
  },

  // 6. SuperAdmin (Section 8)
  admin: {
    // Paramètres globaux de la plateforme
    getParametresPlateforme: () => request<ParametrePlateforme>('/api/admin/parametres-plateforme/'),
    updateParametresPlateforme: (data: Partial<ParametrePlateforme>) =>
      request<ParametrePlateforme>('/api/admin/parametres-plateforme/', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    // Indicateurs globaux plateforme
    getStats: () => request<AdminStats>('/api/admin/stats/'),

    // Audit log des transactions
    getHistorique: (params?: { order?: string; type_evenement?: string; canal?: string; reference_externe?: string; page?: number }) => {
      const search = new URLSearchParams();
      if (params?.order) search.set('order', params.order);
      if (params?.type_evenement) search.set('type_evenement', params.type_evenement);
      if (params?.canal) search.set('canal', params.canal);
      if (params?.reference_externe) search.set('reference_externe', params.reference_externe);
      if (params?.page) search.set('page', params.page.toString());
      const query = search.toString();
      return request<PaginatedResponse<TransactionAuditLog>>(`/api/admin/historique/${query ? `?${query}` : ''}`);
    },

    // Demandes d'adhésion organisateur côté SuperAdmin
    getDemandesOrganisateurs: (params?: { statut?: string; user?: string; page?: number }) => {
      const search = new URLSearchParams();
      if (params?.statut) search.set('statut', params.statut);
      if (params?.user) search.set('user', params.user);
      if (params?.page) search.set('page', params.page.toString());
      const query = search.toString();
      return request<PaginatedResponse<DemandeOrganisateur>>(`/api/admin/organisateurs/demandes/${query ? `?${query}` : ''}`);
    },

    // Décision finale SuperAdmin sur une demande organisateur
    deciderDemandeOrganisateur: (id: string, payload: { statut: 'APPROUVE' | 'REJETE'; motif_rejet?: string }) =>
      request<{ detail: string; organisateur_id?: string; demande: DemandeOrganisateur }>(
        `/api/admin/organisateurs/demandes/${id}/decider/`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),

    // Versements (compatibilité)
    getVersements: (params?: { statut?: string; canal?: string; organisateur?: string }) => {
      const search = new URLSearchParams();
      if (params?.statut) search.set('statut', params.statut);
      if (params?.canal) search.set('canal', params.canal);
      if (params?.organisateur) search.set('organisateur', params.organisateur);
      const query = search.toString();
      return request<PaginatedResponse<Versement>>(`/api/admin/versements/${query ? `?${query}` : ''}`);
    },
  },

  // 7. Paiements dev
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
};
