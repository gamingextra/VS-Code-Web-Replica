'use client';

import { create } from 'zustand';

export type WSStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

interface WSMessage {
  id: string;
  type: 'terminal' | 'lsp' | 'file' | 'session' | 'status';
  direction: 'sent' | 'received';
  data: string;
  timestamp: number;
}

interface WebSocketState {
  status: WSStatus;
  latency: number; // ms
  messages: WSMessage[];
  connectedAt: number | null;
  reconnectAttempts: number;
  serverUrl: string;
  socket: unknown; // Socket.IO client instance
  useRealWS: boolean;

  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  addMessage: (msg: Omit<WSMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  simulateActivity: () => void;
  sendTerminalInput: (sessionId: string, input: string) => void;
  subscribeFiles: (paths: string[]) => void;
  requestCompletion: (requestId: string, prefix: string, suffix: string, language: string, fileName: string) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  status: 'connected',
  latency: 12,
  messages: [],
  connectedAt: Date.now() - 300000,
  reconnectAttempts: 0,
  serverUrl: 'ws://127.0.0.1:3001',
  socket: null,
  useRealWS: false,

  connect: () => {
    set({ status: 'connecting' });

    // Try to connect to real WebSocket (Socket.IO on Core API)
    try {
      // Dynamic import to avoid SSR issues
      import('socket.io-client').then(({ io }) => {
        const socket = io('/?XTransformPort=3001', {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
          set({
            status: 'connected',
            connectedAt: Date.now(),
            reconnectAttempts: 0,
            latency: 8 + Math.floor(Math.random() * 20),
            socket,
            useRealWS: true,
          });
        });

        socket.on('disconnect', () => {
          set({ status: 'reconnecting' });
        });

        socket.on('terminal:output', (data: { sessionId: string; output: string; timestamp: number }) => {
          get().addMessage({ type: 'terminal', direction: 'received', data: data.output });
        });

        socket.on('file:updated', (data: unknown) => {
          get().addMessage({ type: 'file', direction: 'received', data: JSON.stringify(data) });
        });

        socket.on('copilot:chunk', (data: { requestId: string; chunk: string }) => {
          get().addMessage({ type: 'lsp', direction: 'received', data: data.chunk });
        });

        socket.on('copilot:done', () => {
          get().addMessage({ type: 'lsp', direction: 'received', data: 'completion:done' });
        });
      }).catch(() => {
        // Socket.IO client not available, use simulated
        set({
          status: 'connected',
          connectedAt: Date.now(),
          reconnectAttempts: 0,
          latency: 8 + Math.floor(Math.random() * 20),
          useRealWS: false,
        });
      });
    } catch {
      // Fallback to simulated connection
      setTimeout(() => {
        set({
          status: 'connected',
          connectedAt: Date.now(),
          reconnectAttempts: 0,
          latency: 8 + Math.floor(Math.random() * 20),
        });
      }, 800);
    }
  },

  disconnect: () => {
    const state = get();
    if (state.socket && typeof (state.socket as any).disconnect === 'function') {
      (state.socket as any).disconnect();
    }
    set({ status: 'disconnected', connectedAt: null, socket: null, useRealWS: false });
  },

  reconnect: () => {
    const state = get();
    set({ status: 'reconnecting', reconnectAttempts: state.reconnectAttempts + 1 });
    setTimeout(() => {
      set({
        status: 'connected',
        connectedAt: Date.now(),
        reconnectAttempts: 0,
        latency: 10 + Math.floor(Math.random() * 30),
      });
    }, 1000 + Math.random() * 2000);
  },

  addMessage: (msg) => {
    const state = get();
    set({
      messages: [...state.messages.slice(-99), {
        ...msg,
        id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      }],
    });
  },

  clearMessages: () => set({ messages: [] }),

  simulateActivity: () => {
    const types: Array<{ type: WSMessage['type']; data: string }> = [
      { type: 'terminal', data: 'Terminal data stream received' },
      { type: 'lsp', data: 'LSP: textDocument/didChange' },
      { type: 'file', data: 'File system change detected' },
      { type: 'session', data: 'Session heartbeat' },
      { type: 'status', data: 'Server status: OK' },
    ];
    const msg = types[Math.floor(Math.random() * types.length)];
    const direction = Math.random() > 0.5 ? 'received' : 'sent';
    get().addMessage({ ...msg, direction });
  },

  // Real WebSocket methods
  sendTerminalInput: (sessionId, input) => {
    const state = get();
    if (state.socket && state.useRealWS && typeof (state.socket as any).emit === 'function') {
      (state.socket as any).emit('terminal:input', { sessionId, input });
      get().addMessage({ type: 'terminal', direction: 'sent', data: input });
    }
  },

  subscribeFiles: (paths) => {
    const state = get();
    if (state.socket && state.useRealWS && typeof (state.socket as any).emit === 'function') {
      (state.socket as any).emit('file:subscribe', { paths });
    }
  },

  requestCompletion: (requestId, prefix, suffix, language, fileName) => {
    const state = get();
    if (state.socket && state.useRealWS && typeof (state.socket as any).emit === 'function') {
      (state.socket as any).emit('copilot:complete', { requestId, prefix, suffix, language, fileName });
    }
  },
}));
