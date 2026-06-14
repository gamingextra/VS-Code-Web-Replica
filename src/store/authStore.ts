import { create } from 'zustand';
import { login as apiLogin } from '@/lib/api-client';

interface AuthState {
  isAuthenticated: boolean;
  username: string;
  isLoggingIn: boolean;
  error: string | null;
  token: string | null;
  backendAvailable: boolean;

  login: (password: string) => boolean;
  logout: () => void;
  clearError: () => void;
}

const VALID_PASSWORD = 'vscode';
const VALID_USERNAME = 'coder';

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: typeof window !== 'undefined' ? localStorage.getItem('vscode-auth') === 'true' : false,
  username: '',
  isLoggingIn: false,
  error: null,
  token: null,
  backendAvailable: true,

  login: (password: string) => {
    set({ isLoggingIn: true, error: null });

    // Try real API first
    apiLogin(password).then((result) => {
      if (result.success) {
        set({
          isAuthenticated: true,
          username: result.username || VALID_USERNAME,
          isLoggingIn: false,
          error: null,
          token: result.token || null,
          backendAvailable: true,
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('vscode-auth', 'true');
          if (result.token) localStorage.setItem('vscode-token', result.token);
        }
      } else {
        set({
          isAuthenticated: false,
          isLoggingIn: false,
          error: result.error || 'Login failed',
          backendAvailable: true,
        });
      }
    }).catch(() => {
      // Fallback: local authentication
      if (password === VALID_PASSWORD) {
        set({
          isAuthenticated: true,
          username: VALID_USERNAME,
          isLoggingIn: false,
          error: null,
          backendAvailable: false,
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('vscode-auth', 'true');
        }
      } else {
        set({
          isAuthenticated: false,
          isLoggingIn: false,
          error: 'Incorrect password. Please try again.',
          backendAvailable: false,
        });
      }
    });

    // Synchronous check for immediate UI feedback
    if (password === VALID_PASSWORD) {
      set({ isAuthenticated: true, username: VALID_USERNAME, isLoggingIn: false, error: null });
      if (typeof window !== 'undefined') {
        localStorage.setItem('vscode-auth', 'true');
      }
      return true;
    }
    set({ isLoggingIn: false, error: 'Incorrect password. Please try again.' });
    return false;
  },

  logout: () => {
    set({ isAuthenticated: false, username: '', token: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vscode-auth');
      localStorage.removeItem('vscode-token');
    }
  },

  clearError: () => set({ error: null }),
}));
