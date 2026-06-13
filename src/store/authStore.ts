import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  username: string;
  isLoggingIn: boolean;
  error: string | null;
  login: (password: string) => boolean;
  logout: () => void;
  clearError: () => void;
}

// Simulated password (like code-server's randomly generated password)
const VALID_PASSWORD = 'vscode';
const VALID_USERNAME = 'coder';

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  username: '',
  isLoggingIn: false,
  error: null,

  login: (password: string) => {
    set({ isLoggingIn: true, error: null });
    // Simulate network delay
    setTimeout(() => {
      if (password === VALID_PASSWORD) {
        set({ isAuthenticated: true, username: VALID_USERNAME, isLoggingIn: false, error: null });
        if (typeof window !== 'undefined') {
          localStorage.setItem('vscode-auth', 'true');
        }
      } else {
        set({ isAuthenticated: false, isLoggingIn: false, error: 'Incorrect password. Please try again.' });
      }
    }, 300);
    // Return true for correct password (synchronous check for immediate feedback)
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
    set({ isAuthenticated: false, username: '' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vscode-auth');
    }
  },

  clearError: () => set({ error: null }),
}));
