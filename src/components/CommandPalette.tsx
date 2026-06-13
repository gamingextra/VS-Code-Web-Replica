'use client';

import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useSidebarStore } from '@/store/sidebarStore';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystemStore, type FileNode } from '@/store/fileSystemStore';
import { useThemeStore, type Theme } from '@/store/themeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTerminalStore } from '@/store/terminalStore';
import { useAICompletionStore } from '@/store/aiCompletionStore';
import { useCodeExecutionStore } from '@/store/codeExecutionStore';
import { useBreakpoint } from '@/hooks/useWindowSize';

interface CommandItem {
  label: string;
  shortcut?: string;
  category?: string;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'command' | 'file' | 'line'>('command');
  const [search, setSearch] = useState('');

  const sidebar = useSidebarStore();
  const editor = useEditorStore();
  const fs = useFileSystemStore();
  const theme = useThemeStore();
  const settings = useSettingsStore();
  const terminal = useTerminalStore();
  const ai = useAICompletionStore();
  const execution = useCodeExecutionStore();
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); setMode('command'); setSearch(''); setOpen(true); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p' && !e.shiftKey) { e.preventDefault(); setMode('file'); setSearch(''); setOpen(true); }
      else if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { command } = (e as CustomEvent).detail;
      if (command === 'commandPalette') { setMode('command'); setSearch(''); setOpen(true); }
      if (command === 'quickOpen') { setMode('file'); setSearch(''); setOpen(true); }
    };
    window.addEventListener('vscode:command', handler);
    return () => window.removeEventListener('vscode:command', handler);
  }, []);

  const run = (action: () => void) => { action(); setOpen(false); setSearch(''); };
  const emit = (command: string) => window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command } }));

  const commands: CommandItem[] = [
    { category: 'File', label: 'New File', shortcut: 'Ctrl+N', action: () => run(() => editor.setActiveTab(editor.newUntitled())) },
    { category: 'File', label: 'Save', shortcut: 'Ctrl+S', action: () => run(() => { const t = editor.getActiveTab(); if (t) editor.markClean(t.id); }) },
    { category: 'File', label: 'Close Editor', shortcut: 'Ctrl+W', action: () => run(() => { const t = editor.getActiveTab(); if (t) editor.closeTab(t.id); }) },
    { category: 'View', label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: () => run(() => sidebar.toggle()) },
    { category: 'View', label: 'Toggle Panel', shortcut: 'Ctrl+J', action: () => run(() => emit('togglePanel')) },
    { category: 'View', label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: () => run(() => emit('toggleTerminal')) },
    { category: 'View', label: 'Toggle Zen Mode', shortcut: 'Ctrl+K Z', action: () => run(() => settings.toggleZenMode()) },
    { category: 'View', label: 'Split Editor', shortcut: 'Ctrl+\\', action: () => run(() => editor.splitEditor()) },
    { category: 'View', label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => run(() => { sidebar.setView('explorer'); if (!sidebar.isVisible) sidebar.toggle(); }) },
    { category: 'View', label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => run(() => { sidebar.setView('search'); if (!sidebar.isVisible) sidebar.toggle(); }) },
    { category: 'View', label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: () => run(() => { sidebar.setView('scm'); if (!sidebar.isVisible) sidebar.toggle(); }) },
    { category: 'View', label: 'Run and Debug', shortcut: 'Ctrl+Shift+D', action: () => run(() => { sidebar.setView('run'); if (!sidebar.isVisible) sidebar.toggle(); }) },
    { category: 'View', label: 'Extensions', shortcut: 'Ctrl+Shift+X', action: () => run(() => { sidebar.setView('extensions'); if (!sidebar.isVisible) sidebar.toggle(); }) },
    { category: 'Editor', label: 'Toggle Word Wrap', shortcut: 'Alt+Z', action: () => run(() => settings.setWordWrap(settings.wordWrap === 'off' ? 'on' : 'off')) },
    { category: 'Editor', label: 'Toggle Minimap', action: () => run(() => settings.toggleMinimap()) },
    { category: 'Editor', label: 'Increase Font Size', shortcut: 'Ctrl+=', action: () => run(() => settings.zoomIn()) },
    { category: 'Editor', label: 'Decrease Font Size', shortcut: 'Ctrl+-', action: () => run(() => settings.zoomOut()) },
    { category: 'Editor', label: 'Format Document', shortcut: 'Shift+Alt+F', action: () => run(() => emit('formatDocument')) },
    { category: 'Preferences', label: 'Open Settings', shortcut: 'Ctrl+,', action: () => run(() => emit('openSettings')) },
    { category: 'Preferences', label: 'Color Theme: Dark+', action: () => run(() => theme.setTheme('dark')) },
    { category: 'Preferences', label: 'Color Theme: Light+', action: () => run(() => theme.setTheme('light')) },
    { category: 'Preferences', label: 'Color Theme: Solarized Dark', action: () => run(() => theme.setTheme('solarized')) },
    { category: 'Preferences', label: 'Color Theme: Monokai', action: () => run(() => theme.setTheme('monokai')) },
    { category: 'Preferences', label: 'Color Theme: GitHub', action: () => run(() => theme.setTheme('github')) },
    { category: 'AI', label: 'Toggle AI Completions', action: () => run(() => ai.setEnabled(!ai.enabled)) },
    { category: 'AI', label: 'Accept AI Suggestion', shortcut: 'Tab', action: () => run(() => { if (ai.currentCompletion) { ai.acceptCompletion(); } }) },
    { category: 'AI', label: 'Dismiss AI Suggestion', shortcut: 'Esc', action: () => run(() => ai.dismissCompletion()) },
    { category: 'Execution', label: 'Run Code in Sandbox', action: () => run(() => { const t = editor.getActiveTab(); if (t) execution.execute(t.content, t.path.split('.').pop() || 'plaintext'); }) },
    { category: 'Execution', label: 'Clear Execution Results', action: () => run(() => execution.clearResults()) },
    { category: 'Execution', label: 'Toggle Execution Panel', action: () => run(() => execution.togglePanel()) },
  ];

  const allFiles: { name: string; path: string; content: string; language: string }[] = [];
  const walk = (nodes: FileNode[]) => {
    for (const n of nodes) {
      if (n.type === 'file') allFiles.push({ name: n.name, path: n.path, content: n.content || '', language: n.language || 'plaintext' });
      if (n.children) walk(n.children);
    }
  };
  walk(fs.root);

  const filteredFiles = search ? allFiles.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.path.toLowerCase().includes(search.toLowerCase())) : allFiles;
  const filteredCommands = search ? commands.filter((c) => c.label.toLowerCase().includes(search.toLowerCase()) || (c.category?.toLowerCase().includes(search.toLowerCase()))) : commands;

  const groupedCommands: Record<string, CommandItem[]> = {};
  for (const cmd of filteredCommands) {
    const cat = cmd.category || 'Other';
    if (!groupedCommands[cat]) groupedCommands[cat] = [];
    groupedCommands[cat].push(cmd);
  }

  if (!open) return null;

  const itemStyle: React.CSSProperties = {
    padding: isMobile ? '8px 12px' : '5px 12px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: isMobile ? 14 : 13,
    color: '#cccccc',
    gap: 16,
    minHeight: isMobile ? 40 : undefined,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: isMobile ? '8vh' : '12vh',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: isMobile ? '96vw' : 620,
          maxWidth: '96vw',
          backgroundColor: '#252526',
          border: '1px solid #454545',
          borderRadius: isMobile ? 8 : 6,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Palette">
          <div style={{ display: 'flex', alignItems: 'center', padding: isMobile ? '12px' : '8px 12px', borderBottom: '1px solid #454545' }}>
            <span style={{ color: '#858585', fontSize: isMobile ? 14 : 13, marginRight: 8, flexShrink: 0 }}>
              {mode === 'command' ? '>' : 'Go to file'}
            </span>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={mode === 'command' ? 'Type a command or search...' : 'Type to search for a file'}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#cccccc',
                fontSize: isMobile ? 16 : 13,
                fontFamily: '"Inter", sans-serif',
                minWidth: 0,
              }}
              autoFocus
            />
            {!isMobile && (
              <span style={{ fontSize: 11, color: '#858585', flexShrink: 0, marginLeft: 8 }}>Esc to close</span>
            )}
          </div>

          <Command.List style={{ maxHeight: isMobile ? '55vh' : '60vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {mode === 'command' && (
              <>
                {Object.entries(groupedCommands).map(([category, items]) => (
                  <Command.Group key={category} heading={<div style={{ padding: '4px 12px 2px', fontSize: 11, color: '#858585', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{category}</div>}>
                    {items.map((c) => (
                      <Command.Item key={c.label} onSelect={c.action} style={itemStyle}>
                        <span>{c.label}</span>
                        {c.shortcut && !isMobile && <span style={{ fontSize: 11, color: '#858585', fontFamily: 'monospace', flexShrink: 0 }}>{c.shortcut}</span>}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </>
            )}

            {mode === 'file' && (
              <Command.Group heading={<div style={{ padding: '4px 12px 2px', fontSize: 11, color: '#858585' }}>{filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}</div>}>
                {filteredFiles.slice(0, 50).map((f) => (
                  <Command.Item key={f.path} onSelect={() => run(() => editor.openFile(f.path, f.name, f.content, f.language))} style={itemStyle}>
                    <span style={{ fontWeight: 500 }}>{f.name}</span>
                    {!isMobile && (
                      <span style={{ fontSize: 11, color: '#858585', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.path}</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
