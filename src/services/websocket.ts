import { API_BASE_URL, getStoredAccessToken } from './apiClient';
import { 
  WsServerEvent, 
  WsReadyEvent, 
  WsCommandeCreeEvent, 
  WsCommandeStatutEvent, 
  WsReglementEvent, 
  WsBilletScanEvent 
} from '../types';

/**
 * Calcul de l'URL WebSocket de base selon l'environnement
 * - Production : wss://iwacutix-api.onrender.com (ou VITE_WS_BASE_URL)
 * - Développement : ws://127.0.0.1:8000
 */
export const getWsBaseUrl = (): string => {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  if (metaEnv?.VITE_WS_BASE_URL) {
    return metaEnv.VITE_WS_BASE_URL.replace(/\/+$/, '');
  }

  let base = API_BASE_URL.replace(/\/+$/, '');
  if (base.startsWith('https://')) {
    return 'wss://' + base.slice(8);
  }
  if (base.startsWith('http://')) {
    return 'ws://' + base.slice(7);
  }
  if (base.startsWith('wss://') || base.startsWith('ws://')) {
    return base;
  }
  return `wss://${base}`;
};

/**
 * Construction de l'URL complète avec JWT token en query parameter ?token=
 */
export const buildWsUrl = (path: string, tokenOverride?: string | null): string => {
  const token = tokenOverride !== undefined ? tokenOverride : getStoredAccessToken();
  const base = getWsBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${base}${cleanPath}${query}`;
};

export interface WsConnectionOptions {
  token?: string | null;
  autoReconnect?: boolean;
  reconnectIntervalMs?: number;
  onReady?: (ready: WsReadyEvent) => void;
  onMessage?: (event: WsServerEvent) => void;
  onCommandeCree?: (event: WsCommandeCreeEvent) => void;
  onCommandeStatut?: (event: WsCommandeStatutEvent) => void;
  onReglement?: (event: WsReglementEvent) => void;
  onBilletScan?: (event: WsBilletScanEvent) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

/**
 * Client WebSocket gérant le cycle de vie, la reconnexion intelligente (backoff)
 * et les codes de statut conformes au guide développeur IwacuTix (4401, 4403, 1006).
 */
export class IwacuWebSocketClient {
  private path: string;
  private options: WsConnectionOptions;
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private isDestroyed = false;
  private reconnectAttempts = 0;

  constructor(path: string, options: WsConnectionOptions = {}) {
    this.path = path;
    this.options = {
      autoReconnect: true,
      reconnectIntervalMs: 3000,
      ...options,
    };
    this.connect();
  }

  public connect(): void {
    if (this.isDestroyed) return;

    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    const token = this.options.token !== undefined ? this.options.token : getStoredAccessToken();
    if (!token) {
      return;
    }

    const url = buildWsUrl(this.path, token);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (evt: MessageEvent) => {
        try {
          const parsed = JSON.parse(evt.data) as WsServerEvent;
          if (parsed.type === 'ready') {
            this.options.onReady?.(parsed as WsReadyEvent);
            return;
          }

          this.options.onMessage?.(parsed);

          if (parsed.type === 'commande.cree') {
            this.options.onCommandeCree?.(parsed as WsCommandeCreeEvent);
          } else if (parsed.type === 'commande.statut') {
            this.options.onCommandeStatut?.(parsed as WsCommandeStatutEvent);
          } else if (parsed.type === 'reglement.commission' || parsed.type === 'reglement.organisateur') {
            this.options.onReglement?.(parsed as WsReglementEvent);
          } else if (parsed.type === 'billet.scan') {
            this.options.onBilletScan?.(parsed as WsBilletScanEvent);
          }
        } catch (err) {
          console.warn('[IwacuTix WS] Erreur lors du parsing JSON du message :', err);
        }
      };

      this.ws.onerror = (err: Event) => {
        this.options.onError?.(err);
      };

      this.ws.onclose = (evt: CloseEvent) => {
        this.options.onClose?.(evt);

        // 4401 : Token JWT absent, invalide ou utilisateur inactif
        // 4403 : Token valide mais ressource non autorisée
        if (evt.code === 4401 || evt.code === 4403) {
          console.warn(`[IwacuTix WS] Déconnexion avec code d'autorisation ${evt.code}. Reconnexion automatique suspendue.`);
          return;
        }

        // Reconnexion automatique sur rupture de socket (1000, 1006, etc.)
        if (this.options.autoReconnect && !this.isDestroyed) {
          this.reconnectAttempts++;
          const delay = Math.min((this.options.reconnectIntervalMs || 3000) * Math.min(this.reconnectAttempts, 3), 10000);
          this.scheduleReconnect(delay);
        }
      };
    } catch (err) {
      console.warn('[IwacuTix WS] Erreur lors de l\'instanciation WebSocket :', err);
      if (this.options.autoReconnect && !this.isDestroyed) {
        this.scheduleReconnect(this.options.reconnectIntervalMs || 3000);
      }
    }
  }

  private scheduleReconnect(delay: number): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public updateToken(newToken: string): void {
    this.options.token = newToken;
    this.connect();
  }

  public close(): void {
    this.isDestroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }

  public get isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Endpoints prêts à l'emploi selon la spécification
 */
export const wsService = {
  // /ws/evenements/ (Utilisateur connecté : commandes, règlements)
  connectUserEvents: (options: WsConnectionOptions = {}) =>
    new IwacuWebSocketClient('/ws/evenements/', options),

  // /ws/commandes/{order_id}/ (Commande spécifique)
  connectOrder: (orderId: string, options: WsConnectionOptions = {}) =>
    new IwacuWebSocketClient(`/ws/commandes/${orderId}/`, options),

  // /ws/evenement/{event_id}/ (Scans de billets de cet événement)
  connectEventScans: (eventId: string, options: WsConnectionOptions = {}) =>
    new IwacuWebSocketClient(`/ws/evenement/${eventId}/`, options),

  // /ws/organisateur/ (Dashboard organisateur temps réel)
  connectOrganizer: (options: WsConnectionOptions = {}) =>
    new IwacuWebSocketClient('/ws/organisateur/', options),
};
