'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export function LoginScreen() {
  const { login, error, clearError, isAuthenticated } = useAuthStore();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState<number[]>([]);
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('vscode-auth');
      if (auth === 'true') {
        useAuthStore.setState({ isAuthenticated: true, username: 'coder' });
      }
    }
  }, []);

  const checkRateLimit = () => {
    const now = Date.now();
    const recentAttempts = loginAttempts.filter((t) => now - t < 60000);
    setLoginAttempts(recentAttempts);
    if (recentAttempts.length >= 2) {
      setRateLimited(true);
      setTimeout(() => setRateLimited(false), 60000 - (now - recentAttempts[0]));
      return false;
    }
    setLoginAttempts([...recentAttempts, now]);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimited) return;
    if (!checkRateLimit()) return;
    if (password.trim()) {
      login(password);
    }
  };

  if (isAuthenticated) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#1e1e1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 400,
          width: '100%',
          padding: '0 24px',
        }}
      >
        {/* VS Code Logo */}
        <svg width="64" height="64" viewBox="0 0 256 256" style={{ marginBottom: 24 }}>
          <defs>
            <linearGradient id="a" x1="50%" x2="50%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#29B6F6" />
              <stop offset="100%" stopColor="#0288D1" />
            </linearGradient>
          </defs>
          <path fill="url(#a)" d="M180.8 42.4L136 64l-57.6-36L32 60.8v134.4L78.4 228l57.6-36 44.8 21.6 44.8-22.4V64l-44.8-21.6z" />
          <path fill="#FFF" opacity="0.1" d="M78.4 228L32 195.2V60.8L78.4 92z" />
          <path fill="#FFF" opacity="0.15" d="M180.8 42.4L136 64v128l44.8 21.6 44.8-22.4V64z" />
          <path fill="#FFF" opacity="0.05" d="M78.4 92L32 60.8 136 0l44.8 42.4L78.4 92z" />
        </svg>

        <h1
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: '#cccccc',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          code-server
        </h1>
        <p
          style={{
            fontSize: 13,
            color: '#888888',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          Access your development environment from anywhere
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ width: '100%' }}>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                color: '#cccccc',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
                placeholder="Enter password"
                autoFocus
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 40px 0 12px',
                  backgroundColor: '#3c3c3c',
                  border: `1px solid ${error ? '#f48771' : '#555555'}`,
                  borderRadius: 4,
                  color: '#cccccc',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#888888',
                  cursor: 'pointer',
                  fontSize: 12,
                  padding: 0,
                }}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {(error || rateLimited) && (
            <div
              style={{
                fontSize: 12,
                color: '#f48771',
                backgroundColor: 'rgba(244, 135, 113, 0.1)',
                padding: '6px 10px',
                borderRadius: 4,
                border: '1px solid rgba(244, 135, 113, 0.3)',
              }}
            >
              {rateLimited
                ? 'Too many login attempts. Please wait a minute and try again.'
                : error}
            </div>
          )}

          <button
            type="submit"
            disabled={rateLimited}
            style={{
              height: 36,
              backgroundColor: rateLimited ? '#555555' : '#0e639c',
              color: rateLimited ? '#888888' : '#ffffff',
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 500,
              cursor: rateLimited ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!rateLimited) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1177bb';
            }}
            onMouseLeave={(e) => {
              if (!rateLimited) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0e639c';
            }}
          >
            {rateLimited ? 'Rate Limited' : 'Sign In'}
          </button>
        </form>

        <div
          style={{
            marginTop: 24,
            padding: '12px 16px',
            backgroundColor: '#2d2d2d',
            borderRadius: 6,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: '#888888',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: '#cccccc' }}>Demo credentials:</strong>
            <br />
            Password: <code style={{ color: '#4ec9b0', fontFamily: 'monospace' }}>vscode</code>
          </p>
        </div>

        <p
          style={{
            marginTop: 24,
            fontSize: 11,
            color: '#555555',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Rate-limited to 2 attempts per minute (like code-server).
          <br />
          Password is hashed with Argon2 on the server side.
        </p>
      </div>
    </div>
  );
}
