import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  WsServerEvent, 
  WsReadyEvent, 
  WsCommandeCreeEvent, 
  WsCommandeStatutEvent, 
  WsReglementEvent, 
  WsBilletScanEvent 
} from '../types';
import { IwacuWebSocketClient, WsConnectionOptions } from '../services/websocket';
import { getStoredAccessToken } from '../services/apiClient';

export interface UseWebSocketOptions {
  enabled?: boolean;
  token?: string | null;
  autoReconnect?: boolean;
  reconnectIntervalMs?: number;
  eventTypes?: string[];
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
 * Hook React générique d'abonnement WebSocket
 */
export function useWebSocket(
  path: string | null | undefined,
  options: UseWebSocketOptions = {}
) {
  const {
    enabled = true,
    token,
    autoReconnect = true,
    reconnectIntervalMs = 3000,
    eventTypes,
    onReady,
    onMessage,
    onCommandeCree,
    onCommandeStatut,
    onReglement,
    onBilletScan,
    onError,
    onClose,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WsServerEvent | null>(null);
  const [history, setHistory] = useState<WsServerEvent[]>([]);

  const callbacksRef = useRef({
    onReady,
    onMessage,
    onCommandeCree,
    onCommandeStatut,
    onReglement,
    onBilletScan,
    onError,
    onClose,
  });

  useEffect(() => {
    callbacksRef.current = {
      onReady,
      onMessage,
      onCommandeCree,
      onCommandeStatut,
      onReglement,
      onBilletScan,
      onError,
      onClose,
    };
  });

  const eventTypesRef = useRef(eventTypes);
  useEffect(() => {
    eventTypesRef.current = eventTypes;
  }, [eventTypes]);

  useEffect(() => {
    if (!enabled || !path) {
      setIsConnected(false);
      return;
    }

    const currentToken = token !== undefined ? token : getStoredAccessToken();
    if (!currentToken) {
      setIsConnected(false);
      return;
    }

    const wsOptions: WsConnectionOptions = {
      token: currentToken,
      autoReconnect,
      reconnectIntervalMs,
      onReady: (ready) => {
        setIsConnected(true);
        callbacksRef.current.onReady?.(ready);
      },
      onMessage: (evt) => {
        const types = eventTypesRef.current;
        if (!types || types.length === 0 || types.includes(evt.type)) {
          setLastEvent(evt);
          setHistory((prev) => [...prev.slice(-49), evt]);
          callbacksRef.current.onMessage?.(evt);
        }
      },
      onCommandeCree: (evt) => {
        callbacksRef.current.onCommandeCree?.(evt);
      },
      onCommandeStatut: (evt) => {
        callbacksRef.current.onCommandeStatut?.(evt);
      },
      onReglement: (evt) => {
        callbacksRef.current.onReglement?.(evt);
      },
      onBilletScan: (evt) => {
        callbacksRef.current.onBilletScan?.(evt);
      },
      onError: (err) => {
        callbacksRef.current.onError?.(err);
      },
      onClose: (closeEvt) => {
        setIsConnected(false);
        callbacksRef.current.onClose?.(closeEvt);
      },
    };

    const client = new IwacuWebSocketClient(path, wsOptions);

    return () => {
      client.close();
      setIsConnected(false);
    };
  }, [path, enabled, token, autoReconnect, reconnectIntervalMs]);

  const clearHistory = useCallback(() => setHistory([]), []);

  return {
    isConnected,
    lastEvent,
    history,
    clearHistory,
  };
}

/**
 * Hook spécifique : /ws/evenements/ (Utilisateur connecté : commandes, règlements)
 */
export function useUserEventsWebSocket(options: Omit<UseWebSocketOptions, 'enabled'> & { enabled?: boolean } = {}) {
  const token = options.token !== undefined ? options.token : getStoredAccessToken();
  const enabled = options.enabled !== undefined ? options.enabled : Boolean(token);
  return useWebSocket('/ws/evenements/', { ...options, enabled });
}

/**
 * Hook spécifique : /ws/commandes/{order_id}/ (Commande spécifique)
 */
export function useOrderWebSocket(
  orderId: string | null | undefined,
  options: Omit<UseWebSocketOptions, 'enabled'> & { enabled?: boolean } = {}
) {
  const enabled = Boolean(orderId) && (options.enabled !== undefined ? options.enabled : true);
  return useWebSocket(orderId ? `/ws/commandes/${orderId}/` : null, { ...options, enabled });
}

/**
 * Hook spécifique : /ws/evenement/{event_id}/ (Scans de billets de cet événement)
 */
export function useEventScansWebSocket(
  eventId: string | null | undefined,
  options: Omit<UseWebSocketOptions, 'enabled'> & { enabled?: boolean } = {}
) {
  const enabled = Boolean(eventId) && (options.enabled !== undefined ? options.enabled : true);
  return useWebSocket(eventId ? `/ws/evenement/${eventId}/` : null, { ...options, enabled });
}

/**
 * Hook spécifique : /ws/organisateur/ (Dashboard temps réel pour rôle ORGANISATEUR)
 */
export function useOrganizerWebSocket(options: Omit<UseWebSocketOptions, 'enabled'> & { enabled?: boolean } = {}) {
  const token = options.token !== undefined ? options.token : getStoredAccessToken();
  const enabled = options.enabled !== undefined ? options.enabled : Boolean(token);
  return useWebSocket('/ws/organisateur/', { ...options, enabled });
}
