import { 
  ApiAuthResponse, 
  ApiUser,
  ApiCommandePayload, 
  ApiCommandeResponse, 
  ApiCommandeOrder, 
  ApiEvenementPublic, 
  ApiScanResult, 
  ApiTicket, 
  ApiTier, 
  ApiMedia, 
  PaginatedResponse,
  ParametrePlateforme,
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
    // Les endpoints publics d'authentification (login, register, password-reset) ne doivent
    // JAMAIS déclencher un refresh : un 4xx y est une erreur métier, pas un JWT expiré.
    const isPublicAuthEndpoint =
      endpoint.includes('/auth/login/') ||
      endpoint.includes('/auth/register/') ||
      endpoint.includes('/auth/password-reset/');
    if (response.status === 401 && !isRetry && !isPublicAuthEndpoint) {
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
              // Rotation + blacklist : on écrase TOUJOURS l'ancien refresh par le nouveau reçu
              setStoredTokens(data.access, data.refresh);
              onTokenRefreshed(data.access);
              isRefreshing = false;
              // Rejouer la requête d'origine avec le nouveau token
              return request<T>(endpoint, options, true);
            } else {
              clearStoredTokens();
              isRefreshing = false;
              // Refresh expiré / révoqué / blacklisté → déconnexion forcée
              window.dispatchEvent(new Event('iwacutix:session-expired'));
            }
          } catch {
            isRefreshing = false;
            clearStoredTokens();
            window.dispatchEvent(new Event('iwacutix:session-expired'));
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
      return rejectBackendUnavailable<T>(endpoint, options);
    }
    throw err;
  }
}

/**
 * Repli hors-ligne : ne fabrique JAMAIS de données de test.
 * Toute requête non aboutie remonte une erreur backend_indisponible réelle.
 */
function rejectBackendUnavailable<T>(_endpoint: string, _options: RequestInit): Promise<T> {
  throw {
    error: 'Backend momentanément indisponible. Réessayez dans quelques secondes (démarrage Render).',
    code: 'backend_indisponible',
  };
}

// ---------------------------------------------------------------------------
// SERVICE API COMPLET ET EXPORTABLE (100% CONFORME GUIDE DEVELOPPEUR IWACUTIX)
// ---------------------------------------------------------------------------

export const api = {
  // 1. Authentification (Section 1 — module accounts, flux identifiant + mot de passe)
  auth: {
    // 1.1 Inscription publique → compte ACHETEUR ACTIF immédiat, déjà connecté
    register: (data: { email?: string; username?: string; telephone?: string; password: string; nom_complet?: string }) =>
      request<ApiAuthResponse>('/api/auth/register/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 1.2 Connexion commune à tous les rôles (email, username ou téléphone → résolution serveur)
    // Erreur unique anti-énumération : 400 {"identifiant": ["Identifiant ou mot de passe incorrect."]}
    // (validation par champ, PAS un format {error, code} → lire précisément identifiant[0] côté UI)
    login: (identifiant: string, password: string) =>
      request<ApiAuthResponse>('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ identifiant, password }),
      }),

    // 1.3 Rafraîchir les jetons JWT (rotation + BLACKLIST_AFTER_ROTATION: l'ancien refresh est révoqué)
    refreshToken: (refresh: string) =>
      request<{ access: string; refresh: string }>('/api/auth/token/refresh/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      }),

    // 1.4 Profil utilisateur connecté (UserSerializer inclut username, email_verifie)
    me: () => request<ApiUser>('/api/auth/me/'),

    // 1.5 Envoyer l'email de vérification (token valable 1h, throttlé verif_email 3/10min → 429)
    // Réponse succès structurée : { message, code: "verif_envoi" }
    verifierEmail: () =>
      request<{ message?: string; code?: 'verif_envoi' }>('/api/auth/me/verifier-email/', {
        method: 'POST',
      }),

    // 1.5.b Confirmer l'email avec le token reçu (200 → {user}, 400 token_expire | token_invalide)
    confirmerVerifierEmail: (code: string) =>
      request<{ user: ApiUser }>('/api/auth/me/verifier-email/confirmer/', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),

    // 1.6 Demande de réinitialisation de mot de passe (réponse générique anti-énumération, 429 throttlé)
    // Réponse succès structurée : { message, code: "reset_lien_envoye" }
    passwordResetRequest: (identifiant: string) =>
      request<{ message?: string; code?: 'reset_lien_envoye' }>('/api/auth/password-reset/request/', {
        method: 'POST',
        body: JSON.stringify({ identifiant }),
      }),

    // 1.6.b Confirmer la réinitialisation (200 → {user}, 400 token_expire | token_invalide, 429 tentatives_epuisees)
    passwordResetConfirm: (data: { identifiant: string; code: string; nouveau_mdp: string }) =>
      request<{ user: ApiUser }>('/api/auth/password-reset/confirm/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // 1.7 Désactiver le compte (suppression douce → statut DESACTIVE, connexion/achats bloqués ensuite)
    desactiver: () =>
      request<{ user: ApiUser }>('/api/auth/me/desactiver/', {
        method: 'POST',
      }),

    // 1.7.b Réactiver le compte (JWT encore valide → retour ACTIF)
    reactiver: () =>
      request<{ user: ApiUser }>('/api/auth/me/reactiver/', {
        method: 'POST',
      }),

    // 1.8 Mettre à jour la photo de profil (multipart/form-data, redimensionnée 400×400)
    updatePhotoProfil: (photoFile: File) => {
      const formData = new FormData();
      formData.append('photo_profil', photoFile);
      return request<any>('/api/auth/me/photo-profil/', {
        method: 'PATCH',
        body: formData,
      });
    },

    // 1.8.b Supprimer la photo de profil (retour à l'avatar par défaut)
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

    // 2.4 Retirer un scanneur d'un événement (DELETE → 204, suppression d'assignation)
    retirerScanneur: (organisateurId: string, assignmentId: string) =>
      request<void>(`/api/organisateurs/${organisateurId}/scanneurs/${assignmentId}/`, {
        method: 'DELETE',
      }),

    // 2.6.1 Demander la vérification email organisateur (code 6 chiffres, validité 10 min)
    // Erreurs : 400 email_absent (aucune adresse email sur le profil) | 429 tentatives_epuisees
    demanderVerificationEmailOrganisateur: () =>
      request<{ message?: string; canal: 'email' }>('/api/organisateurs/verifier-email/demander/', {
        method: 'POST',
      }),

    // 2.6.2 Confirmer le code de vérification email organisateur
    // Erreurs : 400 code_expire | code_invalide ; 429 tentatives_epuisees
    confirmerVerificationEmailOrganisateur: (code: string) =>
      request<{ message?: string; profil: OrganisateurProfilApi }>(
        '/api/organisateurs/verifier-email/confirmer/',
        {
          method: 'POST',
          body: JSON.stringify({ code }),
        }
      ),

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

  },

};
