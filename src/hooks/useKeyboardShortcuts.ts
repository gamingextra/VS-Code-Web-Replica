'use client';

import { useEffect } from 'react';

type ShortcutHandler = () => void;

const shortcuts: Map<string, ShortcutHandler> = new Map();

export function registerShortcut(name: string, handler: ShortcutHandler): () => void {
  shortcuts.set(name, handler);
  return () => shortcuts.delete(name);
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+Shift+P — Command Palette (handled by CommandPalette component)
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'p') {
        return; // handled elsewhere
      }

      // Ctrl+P — Quick Open (handled by CommandPalette component)
      if (ctrl && e.key.toLowerCase() === 'p' && !e.shiftKey) {
        return; // handled elsewhere
      }

      // Ctrl+B — Toggle Sidebar
      if (ctrl && e.key.toLowerCase() === 'b' && !e.shiftKey) {
        e.preventDefault();
        shortcuts.get('toggleSidebar')?.();
        return;
      }

      // Ctrl+J — Toggle Panel
      if (ctrl && e.key.toLowerCase() === 'j' && !e.shiftKey) {
        e.preventDefault();
        shortcuts.get('togglePanel')?.();
        return;
      }

      // Ctrl+` — Toggle Terminal
      if (ctrl && e.key === '`') {
        e.preventDefault();
        shortcuts.get('toggleTerminal')?.();
        return;
      }

      // Ctrl+\ — Split Editor
      if (ctrl && e.key === '\\') {
        e.preventDefault();
        shortcuts.get('splitEditor')?.();
        return;
      }

      // Ctrl+N — New File
      if (ctrl && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault();
        shortcuts.get('newFile')?.();
        return;
      }

      // Ctrl+W — Close Editor
      if (ctrl && e.key.toLowerCase() === 'w' && !e.shiftKey) {
        e.preventDefault();
        shortcuts.get('closeEditor')?.();
        return;
      }

      // Alt+Z — Toggle Word Wrap
      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        shortcuts.get('toggleWordWrap')?.();
        return;
      }

      // Ctrl+Shift+E — Explorer
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        shortcuts.get('viewExplorer')?.();
        return;
      }

      // Ctrl+Shift+F — Search
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        shortcuts.get('viewSearch')?.();
        return;
      }

      // Ctrl+Shift+G — Source Control
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        shortcuts.get('viewSCM')?.();
        return;
      }

      // Ctrl+Shift+D — Run and Debug
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        shortcuts.get('viewRun')?.();
        return;
      }

      // Ctrl+Shift+X — Extensions
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        shortcuts.get('viewExtensions')?.();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
