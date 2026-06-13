'use client';

import { useEffect, useState, useRef } from 'react';
import { Toaster } from 'sonner';
import { TitleBar } from '@/components/layout/TitleBar';
import { ActivityBar } from '@/components/layout/ActivityBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { TabBar } from '@/components/layout/TabBar';
import { EditorArea } from '@/components/layout/EditorArea';
import { BottomPanel } from '@/components/layout/BottomPanel';
import { StatusBar } from '@/components/layout/StatusBar';
import { CommandPalette } from '@/components/CommandPalette';
import { SettingsPanel } from '@/components/layout/SettingsPanel';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useEditorStore } from '@/store/editorStore';
import { useKeyboardShortcuts, registerShortcut } from '@/hooks/useKeyboardShortcuts';
import { useSidebarStore } from '@/store/sidebarStore';
import { useTerminalStore } from '@/store/terminalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { createDemoWorkspace } from '@/data/demoWorkspace';
import { useBreakpoint } from '@/hooks/useWindowSize';

function KeyboardShortcutsPanel({ onClose }: { onClose: () => void }) {
  const KEYBOARD_SHORTCUTS = [
    { category: 'General', keys: 'Ctrl+Shift+P', label: 'Command Palette' },
    { category: 'General', keys: 'Ctrl+P', label: 'Quick Open (Go to File)' },
    { category: 'General', keys: 'Ctrl+,', label: 'Open Settings' },
    { category: 'General', keys: 'Ctrl+K Z', label: 'Toggle Zen Mode' },
    { category: 'File', keys: 'Ctrl+N', label: 'New File' },
    { category: 'File', keys: 'Ctrl+S', label: 'Save' },
    { category: 'File', keys: 'Ctrl+W', label: 'Close Editor' },
    { category: 'Editor', keys: 'Ctrl+\\', label: 'Split Editor' },
    { category: 'Editor', keys: 'Ctrl+B', label: 'Toggle Sidebar' },
    { category: 'Editor', keys: 'Ctrl+J', label: 'Toggle Panel' },
    { category: 'Editor', keys: 'Ctrl+`', label: 'Toggle Terminal' },
    { category: 'Editor', keys: 'Alt+Z', label: 'Toggle Word Wrap' },
    { category: 'Editor', keys: 'Shift+Alt+F', label: 'Format Document' },
    { category: 'Editor', keys: 'Ctrl+F', label: 'Find' },
    { category: 'Editor', keys: 'Ctrl+H', label: 'Find and Replace' },
    { category: 'Editor', keys: 'Ctrl+=', label: 'Increase Font Size' },
    { category: 'Editor', keys: 'Ctrl+-', label: 'Decrease Font Size' },
    { category: 'Editor', keys: 'Ctrl+G', label: 'Go to Line' },
    { category: 'View', keys: 'Ctrl+Shift+E', label: 'Explorer' },
    { category: 'View', keys: 'Ctrl+Shift+F', label: 'Search' },
    { category: 'View', keys: 'Ctrl+Shift+G', label: 'Source Control' },
    { category: 'View', keys: 'Ctrl+Shift+D', label: 'Run and Debug' },
    { category: 'View', keys: 'Ctrl+Shift+X', label: 'Extensions' },
  ];
  const categories = [...new Set(KEYBOARD_SHORTCUTS.map((s) => s.category))];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, backgroundColor: 'var(--vscode-editor-bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--vscode-border)', flexShrink: 0, backgroundColor: 'var(--vscode-sidebar-bg)', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--vscode-fg)' }}>Keyboard Shortcuts</span>
        <button onClick={onClose} className="px-3 py-1 text-[12px] bg-[var(--vscode-button-bg)] text-white rounded hover:opacity-90 ml-auto">Close</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {categories.map((cat) => (
          <div key={cat} className="mb-6">
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-50 mb-2">{cat}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {KEYBOARD_SHORTCUTS.filter((s) => s.category === cat).map((s) => (
                  <tr key={s.keys} style={{ borderBottom: '1px solid var(--vscode-border)' }}>
                    <td style={{ padding: '6px 0', fontSize: 13, color: 'var(--vscode-fg)', width: '60%' }}>{s.label}</td>
                    <td style={{ padding: '6px 0', fontSize: 12, color: 'var(--vscode-fg)', opacity: 0.7, textAlign: 'right', fontFamily: 'monospace' }}>{s.keys}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { setRoot } = useFileSystemStore();
  const { toggle: toggleSidebar, isVisible: sidebarVisible } = useSidebarStore();
  const { togglePanel } = useTerminalStore();
  const settings = useSettingsStore();
  const { isMobile } = useBreakpoint();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [kbShortcutsOpen, setKbShortcutsOpen] = useState(false);
  const autoSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile && sidebarVisible) toggleSidebar();
  }, [isMobile, sidebarVisible, toggleSidebar]);

  // Initialize demo workspace
  useEffect(() => {
    setRoot(createDemoWorkspace());
  }, [setRoot]);

  // Auto-save: debounce dirty tabs
  useEffect(() => {
    if (settings.autoSave === 'off') return;
    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (settings.autoSave !== 'afterDelay') return;
      for (const tab of state.tabs) {
        const prevTab = prev.tabs.find((t) => t.id === tab.id);
        if (tab.isDirty && tab.content !== prevTab?.content) {
          clearTimeout(autoSaveTimers.current[tab.id]);
          autoSaveTimers.current[tab.id] = setTimeout(() => {
            useEditorStore.getState().markClean(tab.id);
          }, settings.autoSaveDelay);
        }
      }
    });
    return () => {
      unsubscribe();
      Object.values(autoSaveTimers.current).forEach(clearTimeout);
    };
  }, [settings.autoSave, settings.autoSaveDelay]);

  // Register keyboard shortcuts
  useEffect(() => {
    const unsubs = [
      registerShortcut('toggleSidebar', toggleSidebar),
      registerShortcut('togglePanel', togglePanel),
      registerShortcut('splitEditor', () => useEditorStore.getState().splitEditor()),
      registerShortcut('toggleZenMode', () => settings.toggleZenMode()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [toggleSidebar, togglePanel, settings]);

  useKeyboardShortcuts();

  // Zen mode keyboard shortcut (Ctrl+K Z)
  useEffect(() => {
    let lastK = false;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { lastK = true; setTimeout(() => { lastK = false; }, 1000); }
      if (lastK && e.key === 'z') { e.preventDefault(); settings.toggleZenMode(); lastK = false; }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); setSettingsOpen(true); }
      if (lastK && (e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); setKbShortcutsOpen(true); lastK = false; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settings]);

  // Listen for vscode:command events
  useEffect(() => {
    const handler = (e: Event) => {
      const { command } = (e as CustomEvent).detail;
      if (command === 'newTerminal') {
        useTerminalStore.getState().showPanelFn();
        useTerminalStore.getState().setActivePanelTab('terminal');
        useTerminalStore.getState().createTerminal();
      }
      if (command === 'toggleTerminal') {
        useTerminalStore.getState().togglePanel();
        useTerminalStore.getState().setActivePanelTab('terminal');
      }
      if (command === 'togglePanel') useTerminalStore.getState().togglePanel();
      if (command === 'openSettings') setSettingsOpen(true);
      if (command === 'openKeyboardShortcuts') setKbShortcutsOpen(true);
      if (command === 'zenMode') settings.toggleZenMode();
      if (command === 'splitEditor') useEditorStore.getState().splitEditor();
    };
    window.addEventListener('vscode:command', handler);
    return () => window.removeEventListener('vscode:command', handler);
  }, [settings]);

  const { zenMode } = settings;

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        width: '100vw', height: '100vh',
        maxWidth: '100vw', maxHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      {!zenMode && <TitleBar />}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {!zenMode && <ActivityBar />}
        {!zenMode && <Sidebar />}

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <TabBar />
            <EditorArea />
          </div>
          {!zenMode && <BottomPanel />}
        </div>
      </div>

      {!zenMode && <StatusBar />}

      <CommandPalette />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {kbShortcutsOpen && <KeyboardShortcutsPanel onClose={() => setKbShortcutsOpen(false)} />}

      {zenMode && (
        <div
          style={{
            position: 'fixed', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.6)', color: '#ccc', fontSize: 11,
            padding: '4px 12px', borderRadius: 12, zIndex: 100, cursor: 'pointer',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => settings.toggleZenMode()}
        >
          Zen Mode — Press Ctrl+K Z or click to exit
        </div>
      )}

      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            backgroundColor: '#252526',
            border: '1px solid #454545',
            color: '#cccccc',
            fontSize: 13,
          },
        }}
      />
    </div>
  );
}
