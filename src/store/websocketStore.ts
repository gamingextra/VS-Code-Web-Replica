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

  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  addMessage: (msg: Omit<WSMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  simulateActivity: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  status: 'connected',
  latency: 12,
  messages: [],
  connectedAt: Date.now() - 300000, // Connected 5 min ago
  reconnectAttempts: 0,
  serverUrl: 'ws://127.0.0.1:8080',

  connect: () => {
    set({ status: 'connecting' });
    setTimeout(() => {
      set({
        status: 'connected',
        connectedAt: Date.now(),
        reconnectAttempts: 0,
        latency: 8 + Math.floor(Math.random() * 20),
      });
    }, 800 + Math.random() * 400);
  },

  disconnect: () => {
    set({ status: 'disconnected', connectedAt: null });
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
}));
