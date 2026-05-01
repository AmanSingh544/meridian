// ═══════════════════════════════════════════════════════════════
// @3sc/realtime — WebSocket & Realtime Layer
// ═══════════════════════════════════════════════════════════════

import { io, Socket as IOSocket } from 'socket.io-client';
import { REALTIME_CONFIG, PORTAL_CONFIG, API_CONFIG } from '@3sc/config';
import type { RealtimeEvent, RealtimeEventType } from '@3sc/types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';
export type EventListener = (event: RealtimeEvent) => void;
export type StatusListener = (status: ConnectionStatus) => void;

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private eventListeners = new Map<string, Set<EventListener>>();
  private statusListeners = new Set<StatusListener>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private _status: ConnectionStatus = 'disconnected';
  private _useFallback = false;

  constructor(url: string) {
    this.url = url;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this._status === 'connected';
  }

  // ── Connect ───────────────────────────────────────────────
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this._useFallback = false;
        this.startHeartbeat();
        this.stopFallbackPolling();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: RealtimeEvent = JSON.parse(event.data);
          this.emit(data);
        } catch (e) {
          console.error('[Realtime] Failed to parse message:', e);
        }
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        if (!event.wasClean) {
          this.handleReconnect();
        } else {
          this.setStatus('disconnected');
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.handleReconnect();
    }
  }

  // ── Disconnect ────────────────────────────────────────────
  disconnect(): void {
    this.stopHeartbeat();
    this.stopReconnect();
    this.stopFallbackPolling();
    this.ws?.close(1000, 'Client disconnect');
    this.ws = null;
    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  // ── Event Subscription ────────────────────────────────────
  on(eventType: RealtimeEventType | '*', listener: EventListener): () => void {
    const key = eventType as string;
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, new Set());
    }
    this.eventListeners.get(key)!.add(listener);

    return () => {
      this.eventListeners.get(key)?.delete(listener);
    };
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  // ── Internal ──────────────────────────────────────────────
  private emit(event: RealtimeEvent): void {
    // Specific listeners
    this.eventListeners.get(event.type as string)?.forEach((fn) => fn(event));
    // Wildcard listeners
    this.eventListeners.get('*')?.forEach((fn) => fn(event));
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= REALTIME_CONFIG.maxReconnectAttempts) {
      this.setStatus('failed');
      this.startFallbackPolling();
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;

    const delay = REALTIME_CONFIG.reconnectInterval * Math.min(this.reconnectAttempts, 5);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, REALTIME_CONFIG.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ── Fallback Polling ──────────────────────────────────────
  private startFallbackPolling(): void {
    if (this._useFallback) return;
    this._useFallback = true;

    this.pollTimer = setInterval(async () => {
      try {
        const response = await fetch('/api/v1/realtime/poll', {
          credentials: 'include',
          headers: { 'X-Portal-Type': PORTAL_CONFIG.type },
        });
        if (response.ok) {
          const events: RealtimeEvent[] = await response.json();
          events.forEach((e) => this.emit(e));
        }
      } catch {
        // Silent fail for polling
      }
    }, REALTIME_CONFIG.fallbackPollInterval);
  }

  private stopFallbackPolling(): void {
    this._useFallback = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

// ── Singleton Factory ───────────────────────────────────────────
let clientInstance: RealtimeClient | null = null;

export function getRealtimeClient(url?: string): RealtimeClient {
  if (!clientInstance && url) {
    clientInstance = new RealtimeClient(url);
  }
  if (!clientInstance) {
    throw new Error('Realtime client not initialized. Call with URL first.');
  }
  return clientInstance;
}

export function destroyRealtimeClient(): void {
  clientInstance?.disconnect();
  clientInstance = null;
}
// ── Copilot Socket.IO Client ──────────────────────────────────────────────

export type CopilotStreamEvent =
  | { type: 'token'; content: string }
  | { type: 'tool_start'; tools: string[] }
  | { type: 'tool_end'; results: unknown[] }
  | { type: 'draft'; draft: unknown }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; message: string };

export class CopilotSocketClient {
  private socket: IOSocket | null = null;
  private url: string;
  private listeners = new Set<(event: CopilotStreamEvent) => void>();

  constructor(url?: string) {
    // Derive base URL from API config (strip /api/v1)
    const baseUrl = url ?? API_CONFIG.baseUrl.replace(/\/api\/v1$/, '').replace(/\/api\/v1\/$/, '');
    this.url = baseUrl;
  }

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(`${this.url}/copilot`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('[CopilotSocket] Connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[CopilotSocket] Disconnected:', reason);
    });

    this.socket.on('copilot:stream', (event: CopilotStreamEvent) => {
      this.listeners.forEach((fn) => fn(event));
    });

    this.socket.on('copilot:done', (data: { conversationId: string }) => {
      this.listeners.forEach((fn) => fn({ type: 'done', conversationId: data.conversationId }));
    });

    this.socket.on('copilot:error', (data: { message: string }) => {
      this.listeners.forEach((fn) => fn({ type: 'error', message: data.message }));
    });

    this.socket.on('copilot:draft-result', (data: { conversationId: string; result: unknown }) => {
      this.listeners.forEach((fn) =>
        fn({ type: 'tool_end', results: [data.result] }),
      );
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  onEvent(listener: (event: CopilotStreamEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  sendChat(conversationId: string, message: string, context?: Record<string, unknown>): void {
    this.socket?.emit('copilot:chat_stream', { conversationId, message, context });
  }

  executeDraft(conversationId: string, tool: string, payload: Record<string, unknown>): void {
    this.socket?.emit('copilot:execute-draft', { conversationId, tool, payload });
  }
}

let copilotClientInstance: CopilotSocketClient | null = null;

export function getCopilotSocketClient(url?: string): CopilotSocketClient {
  if (!copilotClientInstance) {
    copilotClientInstance = new CopilotSocketClient(url);
  }
  return copilotClientInstance;
}

export function destroyCopilotSocketClient(): void {
  copilotClientInstance?.disconnect();
  copilotClientInstance = null;
}
