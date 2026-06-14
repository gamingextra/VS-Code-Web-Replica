import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useSidebarStore } from '@/store/sidebarStore';
import { useEditorStore } from '@/store/editorStore';
import { useFileSystemStore, type FileNode } from '@/store/fileSystemStore';
import { useThemeStore } from '@/store/themeStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTerminalStore } from '@/store/terminalStore';

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault(); setMode('command'); setSearch(''); setOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p' && !e.shiftKey) {
        e.preventDefault(); setMode('file'); setSearch(''); setOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'openSettings' } }));
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g' && !e.shiftKey) {
        e.preventDefault(); setMode('line'); setSearch(':'); setOpen(true);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault(); setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Also listen for palette open commands from menus
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
  const emit = (command: string, detail?: Record<string, unknown>) =>
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command, ...detail } }));

  const commands: CommandItem[] = [
    // File
    { category: 'File', label: 'New File', shortcut: 'Ctrl+N', action: () => run(() => editor.setActiveTab(editor.newUntitled())) },
    { category: 'File', label: 'Save', shortcut: 'Ctrl+S', action: () => run(() => { const t = editor.getActiveTab(); if (t) editor.markClean(t.id); }) },
    { category: 'File', label: 'Save All', action: () => run(() => { editor.tabs.forEach((t) => editor.markClean(t.id)); }) },
    { category: 'File', label: 'Revert File', action: () => run(() => { /* noop */ }) },
    { category: 'File', label: 'Close Editor', shortcut: 'Ctrl+W', action: () => run(() => { const t = editor.getActiveTab(); if (t) editor.closeTab(t.id); }) },
    { category: 'File', label: 'Close All Editors', action: () => run(() => { [...editor.tabs].forEach((t) => editor.closeTab(t.id)); }) },

    // Edit
    { category: 'Edit', label: 'Undo', shortcut: 'Ctrl+Z', action: () => run(() => emit('undo')) },
    { category: 'Edit', label: 'Redo', shortcut: 'Ctrl+Y', action: () => run(() => emit('redo')) },
    { category: 'Edit', label: 'Find', shortcut: 'Ctrl+F', action: () => run(() => emit('find')) },
    { category: 'Edit', label: 'Replace', shortcut: 'Ctrl+H', action: () => run(() => emit('replace')) },
    { category: 'Edit', label: 'Select All', shortcut: 'Ctrl+A', action: () => run(() => emit('selectAll')) },
    { category: 'Edit', label: 'Format Document', shortcut: 'Shift+Alt+F', action: () => run(() => emit('formatDocument')) },
    { category: 'Edit', label: 'Copy Line Up', shortcut: 'Shift+Alt+Up', action: () => run(() => emit('copyLineUp')) },
    { category: 'Edit', label: 'Copy Line Down', shortcut: 'Shift+Alt+Down', action: () => run(() => emit('copyLineDown')) },
    { category: 'Edit', label: 'Move Line Up', shortcut: 'Alt+Up', action: () => run(() => emit('moveLineUp')) },
    { category: 'Edit', label: 'Move Line Down', shortcut: 'Alt+Down', action: () => run(() => emit('moveLineDown')) },
    { category: 'Edit', label: 'Indent Line', shortcut: 'Ctrl+]', action: () => run(() => emit('indentLine')) },
    { category: 'Edit', label: 'Outdent Line', shortcut: 'Ctrl+[', action: () => run(() => emit('outdentLine')) },
    { category: 'Edit', label: 'Add Cursor Above', shortcut: 'Ctrl+Alt+Up', action: () => run(() => emit('addCursorAbove')) },
    { category: 'Edit', label: 'Add Cursor Below', shortcut: 'Ctrl+Alt+Down', action: () => run(() => emit('addCursorBelow')) },

    // View
    { category: 'View', label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: () => run(() => sidebar.toggle()) },
    { category: 'View', label: 'Toggle Panel', shortcut: 'Ctrl+J', action: () => run(() => emit('togglePanel')) },
    { category: 'View', label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: () => run(() => emit('toggleTerminal')) },
    { category: 'View', label: 'Toggle Zen Mode', shortcut: 'Ctrl+K Z', action: () => run(() => settings.toggleZenMode()) },
    { category: 'View', label: 'Split Editor', shortcut: 'Ctrl+\\', action: () => run(() => editor.splitEditor()) },
    { category: 'View', label: 'Close Split Editor', action: () => run(() => { const s = editor.splits[editor.activeSplitIndex]; if (s) editor.closeSplit(s.id); }) },
    { category: 'View', label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => run(() => { sidebar.setView('explorer'); if (!sidebar.isVisible) sidebar.toggle(); }) },
    { category: 'View', label: 'Search (Find in Files)', shortcut: 'Ctrl+Shift+F', action: () => run(() => { sidebar.setView('search'); if (!sidebar.isVisible) sidebar.toggle(); }) },
    { category: 'View', label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: () => run(() => { sidebar.setView('scm'); if (!sidebar.isVisible) sidebar.toggle(); }) },
    { category: 'View', label: 'Run and Debug', shortcut: 'Ctrl+Shift+D', action: () => run(() => { sidebar.setView('run'); if (!sidebar.isVisible) sidebar.toggle(); }) },
    { category: 'View', label: 'Extensions', shortcut: 'Ctrl+Shift+X', action: () => run(() => { sidebar.setView('extensions'); if (!sidebar.isVisible) sidebar.toggle(); }) },
    { category: 'View', label: 'Problems', shortcut: 'Ctrl+Shift+M', action: () => run(() => emit('togglePanel')) },
    { category: 'View', label: 'Output', action: () => run(() => emit('togglePanel')) },
    { category: 'View', label: 'Debug Console', action: () => run(() => emit('togglePanel')) },
    { category: 'View', label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: () => run(() => { terminal.showPanelFn(); terminal.setActivePanelTab('terminal'); terminal.createTerminal(); }) },
    { category: 'View', label: 'Welcome', action: () => run(() => emit('welcome')) },

    // Editor
    { category: 'Editor', label: 'Toggle Word Wrap', shortcut: 'Alt+Z', action: () => run(() => settings.setWordWrap(settings.wordWrap === 'off' ? 'on' : 'off')) },
    { category: 'Editor', label: 'Toggle Minimap', action: () => run(() => settings.toggleMinimap()) },
    { category: 'Editor', label: 'Toggle Line Numbers', action: () => run(() => settings.setLineNumbers(settings.lineNumbers === 'on' ? 'off' : 'on')) },
    { category: 'Editor', label: 'Toggle Auto Save', action: () => run(() => settings.setAutoSave(settings.autoSave === 'off' ? 'afterDelay' : 'off')) },
    { category: 'Editor', label: 'Increase Font Size', shortcut: 'Ctrl+=', action: () => run(() => settings.zoomIn()) },
    { category: 'Editor', label: 'Decrease Font Size', shortcut: 'Ctrl+-', action: () => run(() => settings.zoomOut()) },
    { category: 'Editor', label: 'Reset Font Size', action: () => run(() => settings.resetZoom()) },
    { category: 'Editor', label: 'Go to Line...', shortcut: 'Ctrl+G', action: () => { setMode('line'); setSearch(':'); } },
    { category: 'Editor', label: 'Go to File...', shortcut: 'Ctrl+P', action: () => { setMode('file'); setSearch(''); } },

    // Preferences
    { category: 'Preferences', label: 'Open Settings', shortcut: 'Ctrl+,', action: () => run(() => emit('openSettings')) },
    { category: 'Preferences', label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', action: () => run(() => emit('openKeyboardShortcuts')) },
    { category: 'Preferences', label: 'Color Theme: Dark+', action: () => run(() => theme.setTheme('dark')) },
    { category: 'Preferences', label: 'Color Theme: Light+', action: () => run(() => theme.setTheme('light')) },
    { category: 'Preferences', label: 'Color Theme: Solarized Dark', action: () => run(() => theme.setTheme('solarized')) },
    { category: 'Preferences', label: 'Color Theme: Monokai', action: () => run(() => theme.setTheme('monokai')) },
    { category: 'Preferences', label: 'Color Theme: GitHub', action: () => run(() => theme.setTheme('github')) },
    { category: 'Preferences', label: 'Tab Size: 2', action: () => run(() => settings.setTabSize(2)) },
    { category: 'Preferences', label: 'Tab Size: 4', action: () => run(() => settings.setTabSize(4)) },
    { category: 'Preferences', label: 'Tab Size: 8', action: () => run(() => settings.setTabSize(8)) },

    // Go
    { category: 'Go', label: 'Go to File', shortcut: 'Ctrl+P', action: () => { setMode('file'); setSearch(''); } },
  ];

  // Collect all files
  const allFiles: { name: string; path: string; content: string; language: string }[] = [];
  const walk = (nodes: FileNode[]) => {
    for (const n of nodes) {
      if (n.type === 'file') allFiles.push({ name: n.name, path: n.path, content: n.content || '', language: n.language || 'plaintext' });
      if (n.children) walk(n.children);
    }
  };
  walk(fs.root);

  const filteredFiles = search
    ? allFiles.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()) || f.path.toLowerCase().includes(search.toLowerCase()))
    : allFiles;

  const filteredCommands = search
    ? commands.filter((c) => c.label.toLowerCase().includes(search.toLowerCase()) || (c.category?.toLowerCase().includes(search.toLowerCase())))
    : commands;

  // Group commands by category
  const groupedCommands: Record<string, CommandItem[]> = {};
  for (const cmd of filteredCommands) {
    const cat = cmd.category || 'Other';
    if (!groupedCommands[cat]) groupedCommands[cat] = [];
    groupedCommands[cat].push(cmd);
  }

  if (!open) return null;

  const itemStyle: React.CSSProperties = {
    padding: '5px 12px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
    color: '#cccccc',
    gap: 16,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: 620, maxWidth: '92vw',
          backgroundColor: '#252526', border: '1px solid #454545',
          borderRadius: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Palette">
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #454545' }}>
            <span style={{ color: '#858585', fontSize: 13, marginRight: 8, flexShrink: 0 }}>
              {mode === 'command' ? '>' : mode === 'line' ? 'Go to Line' : 'Go to file'}
            </span>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={
                mode === 'command' ? 'Type a command or search...'
                : mode === 'file' ? 'Type to search for a file'
                : 'Type a line number, e.g. :42'
              }
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#cccccc', fontSize: 13, fontFamily: '"Inter", sans-serif',
              }}
              autoFocus
            />
            <span style={{ fontSize: 11, color: '#858585', flexShrink: 0, marginLeft: 8 }}>Esc to close</span>
          </div>

          <Command.List style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {mode === 'command' && (
              <>
                {Object.entries(groupedCommands).map(([category, items]) => (
                  <Command.Group key={category} heading={
                    <div style={{ padding: '4px 12px 2px', fontSize: 11, color: '#858585', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {category}
                    </div>
                  }>
                    {items.map((c) => (
                      <Command.Item
                        key={c.label}
                        onSelect={c.action}
                        style={itemStyle}
                        data-selected-style={{ backgroundColor: '#094771' }}
                      >
                        <span>{c.label}</span>
                        {c.shortcut && (
                          <span style={{ fontSize: 11, color: '#858585', fontFamily: 'monospace', flexShrink: 0 }}>
                            {c.shortcut}
                          </span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </>
            )}

            {mode === 'file' && (
              <Command.Group heading={
                <div style={{ padding: '4px 12px 2px', fontSize: 11, color: '#858585' }}>
                  {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
                </div>
              }>
                {filteredFiles.slice(0, 50).map((f) => (
                  <Command.Item
                    key={f.path}
                    onSelect={() => run(() => editor.openFile(f.path, f.name, f.content, f.language))}
                    style={itemStyle}
                  >
                    <span style={{ fontWeight: 500 }}>{f.name}</span>
                    <span style={{ fontSize: 11, color: '#858585', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.path}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {mode === 'line' && (
              <Command.Group>
                <Command.Item
                  onSelect={() => {
                    const match = search.match(/:(\d+)/);
                    if (match) {
                      const line = parseInt(match[1], 10);
                      window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'goToLine', line } }));
                    }
                    setOpen(false);
                  }}
                  style={itemStyle}
                >
                  <span>{search.match(/:(\d+)/) ? `Go to line ${search.match(/:(\d+)/)![1]}` : 'Type :lineNumber to navigate'}</span>
                </Command.Item>
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
