import type { FileNode } from '@/store/fileSystemStore';

export function createDemoWorkspace(): FileNode[] {
  return [
    {
      id: 'folder-src',
      name: 'src',
      type: 'folder',
      path: 'src',
      isOpen: true,
      children: [
        {
          id: 'folder-components',
          name: 'components',
          type: 'folder',
          path: 'src/components',
          isOpen: true,
          children: [
            {
              id: 'file-app',
              name: 'App.tsx',
              type: 'file',
              path: 'src/components/App.tsx',
              language: 'typescript',
              content: `import React, { useState } from 'react';
import { Header } from './Header';
import { Button } from './Button';
import './App.css';

interface AppProps {
  title?: string;
}

export function App({ title = 'Hello World' }: AppProps) {
  const [count, setCount] = useState(0);
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={\`app \${isDark ? 'dark' : 'light'}\`}>
      <Header title={title} onToggleTheme={() => setIsDark(!isDark)} />
      <main className="app-main">
        <h2>Counter: {count}</h2>
        <div className="button-group">
          <Button onClick={() => setCount(c => c + 1)}>Increment</Button>
          <Button onClick={() => setCount(c => c - 1)}>Decrement</Button>
          <Button onClick={() => setCount(0)} variant="secondary">Reset</Button>
        </div>
      </main>
    </div>
  );
}

export default App;`,
            },
            {
              id: 'file-header',
              name: 'Header.tsx',
              type: 'file',
              path: 'src/components/Header.tsx',
              language: 'typescript',
              content: `import React from 'react';

interface HeaderProps {
  title: string;
  onToggleTheme: () => void;
}

export function Header({ title, onToggleTheme }: HeaderProps) {
  return (
    <header className="app-header">
      <h1>{title}</h1>
      <nav>
        <button onClick={onToggleTheme}>Toggle Theme</button>
      </nav>
    </header>
  );
}`,
            },
            {
              id: 'file-button',
              name: 'Button.tsx',
              type: 'file',
              path: 'src/components/Button.tsx',
              language: 'typescript',
              content: `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
}: ButtonProps) {
  return (
    <button
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}`,
            },
          ],
        },
        {
          id: 'folder-hooks',
          name: 'hooks',
          type: 'folder',
          path: 'src/hooks',
          isOpen: false,
          children: [
            {
              id: 'file-useauth',
              name: 'useAuth.ts',
              type: 'file',
              path: 'src/hooks/useAuth.ts',
              language: 'typescript',
              content: `import { useState, useEffect, useCallback } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Simulate auth check
    const timer = setTimeout(() => {
      setState({
        user: { id: 1, name: 'Developer', email: 'dev@example.com' },
        loading: false,
        error: null,
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    // Simulate login
    await new Promise(resolve => setTimeout(resolve, 500));
    setState({
      user: { id: 1, name: 'Developer', email },
      loading: false,
      error: null,
    });
  }, []);

  const logout = useCallback(() => {
    setState({ user: null, loading: false, error: null });
  }, []);

  return { ...state, login, logout };
}`,
            },
          ],
        },
        {
          id: 'folder-utils',
          name: 'utils',
          type: 'folder',
          path: 'src/utils',
          isOpen: false,
          children: [
            {
              id: 'file-helpers',
              name: 'helpers.ts',
              type: 'file',
              path: 'src/utils/helpers.ts',
              language: 'typescript',
              content: `/**
 * Utility helper functions
 */

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}`,
            },
          ],
        },
        {
          id: 'folder-types',
          name: 'types',
          type: 'folder',
          path: 'src/types',
          isOpen: false,
          children: [
            {
              id: 'file-index-ts',
              name: 'index.ts',
              type: 'file',
              path: 'src/types/index.ts',
              language: 'typescript',
              content: `export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  totalPages: number;
  totalItems: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
  createdAt: string;
  updatedAt: string;
}

export interface Config {
  apiUrl: string;
  theme: 'light' | 'dark' | 'system';
  locale: string;
  features: Record<string, boolean>;
}`,
            },
          ],
        },
        {
          id: 'file-main',
          name: 'main.tsx',
          type: 'file',
          path: 'src/main.tsx',
          language: 'typescript',
          content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        },
        {
          id: 'file-indexcss',
          name: 'index.css',
          type: 'file',
          path: 'src/index.css',
          language: 'css',
          content: `@import "tailwindcss";

:root {
  --color-primary: #0078d4;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;
  --color-warning: #ffc107;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.app {
  min-height: 100vh;
  transition: background-color 0.3s;
}

.app.dark {
  background-color: #1e1e1e;
  color: #cccccc;
}

.app.light {
  background-color: #ffffff;
  color: #333333;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-primary);
}

.app-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  gap: 24px;
}

.button-group {
  display: flex;
  gap: 12px;
}`,
        },
      ],
    },
    {
      id: 'folder-public',
      name: 'public',
      type: 'folder',
      path: 'public',
      isOpen: false,
      children: [
        {
          id: 'file-favicon',
          name: 'favicon.ico',
          type: 'file',
          path: 'public/favicon.ico',
          content: '',
        },
      ],
    },
    {
      id: 'file-packagejson',
      name: 'package.json',
      type: 'file',
      path: 'package.json',
      language: 'json',
      content: `{
  "name": "my-react-app",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.4.0",
    "vite": "^5.4.0",
    "vitest": "^1.6.0"
  }
}`,
    },
    {
      id: 'file-tsconfig',
      name: 'tsconfig.json',
      type: 'file',
      path: 'tsconfig.json',
      language: 'json',
      content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,
    },
    {
      id: 'file-readme',
      name: 'README.md',
      type: 'file',
      path: 'README.md',
      language: 'markdown',
      content: `# My React App

A modern React application built with TypeScript and Vite.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Features

- ⚡ Vite for fast development
- 🔷 TypeScript for type safety
- 🎨 Tailwind CSS for styling
- 📦 React 18 with hooks

## Project Structure

\`\`\`
src/
  components/   # React components
  hooks/        # Custom hooks
  utils/        # Utility functions
  types/        # TypeScript types
\`\`\`

## License

MIT
`,
    },
    {
      id: 'file-gitignore',
      name: '.gitignore',
      type: 'file',
      path: '.gitignore',
      content: `node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/`,
    },
    {
      id: 'file-viteconfig',
      name: 'vite.config.ts',
      type: 'file',
      path: 'vite.config.ts',
      language: 'typescript',
      content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});`,
    },
  ];
}
