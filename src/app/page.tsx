'use client';

import { useEffect, useState, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { TitleBar } from '@/components/layout/TitleBar';
import { ActivityBar } from '@/components/layout/ActivityBar';
import { VIEW_ITEMS } from '@/components/layout/ActivityBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { TabBar } from '@/components/layout/TabBar';
import { EditorArea } from '@/components/layout/EditorArea';
import { BottomPanel } from '@/components/layout/BottomPanel';
import { StatusBar } from '@/components/layout/StatusBar';
import { CommandPalette } from '@/components/CommandPalette';
import { SettingsPanel } from '@/components/layout/SettingsPanel';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { WorkspaceTrustDialog } from '@/components/dialog/WorkspaceTrustDialog';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useEditorStore } from '@/store/editorStore';
import { useKeyboardShortcuts, registerShortcut } from '@/hooks/useKeyboardShortcuts';
import { useSidebarStore } from '@/store/sidebarStore';
import { useTerminalStore } from '@/store/terminalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useAICompletionStore } from '@/store/aiCompletionStore';
import { useCodeExecutionStore } from '@/store/codeExecutionStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { createDemoWorkspace } from '@/data/demoWorkspace';
import { useBreakpoint } from '@/hooks/useWindowSize';
import { useGlobalSwipeGesture } from '@/hooks/useSwipeGesture';
import { AICompletionIndicator } from '@/components/ai/AICompletionIndicator';
import { CodeExecutionPanel } from '@/components/execution/CodeExecutionPanel';
import { ServiceHealthPanel } from '@/components/ws/ServiceHealthPanel';

function KeyboardShortcutsPanel({ onClose }: { onClose: () => void }) {
  const { isMobile } = useBreakpoint();
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
      <div style={{ display: 'flex', alignItems: 'center', padding: isMobile ? '8px 12px' : '10px 20px', borderBottom: '1px solid var(--vscode-border)', flexShrink: 0, backgroundColor: 'var(--vscode-sidebar-bg)', gap: 12 }}>
        <span style={{ fontSize: isMobile ? 14 : 13, fontWeight: 600, color: 'var(--vscode-fg)' }}>Keyboard Shortcuts</span>
        <button onClick={onClose} className="px-3 py-1 text-[12px] bg-[var(--vscode-button-bg)] text-white rounded hover:opacity-90 ml-auto">Close</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '16px 20px', WebkitOverflowScrolling: 'touch' }}>
        {categories.map((cat) => (
          <div key={cat} className="mb-6">
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-50 mb-2">{cat}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {KEYBOARD_SHORTCUTS.filter((s) => s.category === cat).map((s) => (
                  <tr key={s.keys} style={{ borderBottom: '1px solid var(--vscode-border)' }}>
                    <td style={{ padding: isMobile ? '8px 0' : '6px 0', fontSize: isMobile ? 13 : 13, color: 'var(--vscode-fg)', width: '60%' }}>{s.label}</td>
                    <td style={{ padding: isMobile ? '8px 0' : '6px 0', fontSize: 12, color: 'var(--vscode-fg)', opacity: 0.7, textAlign: 'right', fontFamily: 'monospace' }}>{s.keys}</td>
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

// Mobile bottom navigation bar (replaces ActivityBar on mobile)
function MobileBottomNav() {
  const { activeView, isVisible, setView, toggle } = useSidebarStore();
  const [activePress, setActivePress] = useState<string | null>(null);

  const handleNavClick = (view: string) => {
    if (isVisible && activeView === view) {
      // Toggle off if same view is active
      toggle();
    } else {
      setView(view as 'explorer' | 'search' | 'scm' | 'run' | 'extensions');
      if (!isVisible) toggle();
    }
  };

  return (
    <div
      className="safe-area-bottom"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: 48,
        backgroundColor: 'var(--vscode-activityBar-bg)',
        borderTop: '1px solid var(--vscode-border)',
        flexShrink: 0,
        userSelect: 'none',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {VIEW_ITEMS.map(({ view, icon: Icon, mobileLabel }) => {
        const isActive = isVisible && activeView === view;
        return (
          <button
            key={view}
            onClick={() => handleNavClick(view)}
            onTouchStart={() => setActivePress(view)}
            onTouchEnd={() => setActivePress(null)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              background: activePress === view ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: 'none',
              color: isActive ? 'var(--vscode-activityBar-active)' : '#858585',
              cursor: 'pointer',
              flex: 1,
              height: 48,
              position: 'relative',
              transition: 'background-color 0.1s',
              // Visual pulse on tap - haptic-like feedback
              transform: activePress === view ? 'scale(0.95)' : 'scale(1)',
            }}
          >
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '25%',
                  right: '25%',
                  height: 2,
                  backgroundColor: 'var(--vscode-activityBar-activeBorder)',
                  borderRadius: '0 0 1px 1px',
                }}
              />
            )}
            <Icon size={20} />
            <span style={{ fontSize: 9, fontWeight: 500 }}>{mobileLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const { setRoot } = useFileSystemStore();
  const { toggle: toggleSidebar, isVisible: sidebarVisible } = useSidebarStore();
  const { togglePanel } = useTerminalStore();
  const settings = useSettingsStore();
  const { isAuthenticated } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { isMobile, isLandscape } = useBreakpoint();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [kbShortcutsOpen, setKbShortcutsOpen] = useState(false);
  const [showTrustDialog, setShowTrustDialog] = useState(false);
  const [showExecPanel, setShowExecPanel] = useState(false);
  const aiStore = useAICompletionStore();
  const execStore = useCodeExecutionStore();
  const wsStore = useWebSocketStore();
  const [workspaceTrusted, setWorkspaceTrusted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vscode-workspace-trusted') === 'true';
    }
    return false;
  });
  const autoSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Edge swipe to open sidebar on mobile
  useGlobalSwipeGesture({
    onSwipeRight: () => {
      if (isMobile && !sidebarVisible) {
        toggleSidebar();
      }
    },
    minDistance: 60,
    minVelocity: 0.2,
    enableLeftEdge: true,
    leftEdgeZone: 20,
  });

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile && sidebarVisible) toggleSidebar();
  }, [isMobile, sidebarVisible, toggleSidebar]);

  // Simulate WS reconnection events
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.005) {
        wsStore.reconnect();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [wsStore]);

  // Listen for editor content changes to trigger AI completions
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (!aiStore.enabled) return;
      for (const tab of state.tabs) {
        const prevTab = prev.tabs.find(t => t.id === tab.id);
        if (tab.content !== prevTab?.content && tab.id === (state.splits[state.activeSplitIndex]?.activeTabId)) {
          const lines = tab.content.split('\n');
          const cursorLine = lines[lines.length - 1] || '';
          aiStore.requestCompletion({
            prefix: cursorLine,
            suffix: '',
            language: tab.path.split('.').pop() || 'plaintext',
            fileName: tab.name,
          });
        }
      }
    });
    return () => unsubscribe();
  }, [aiStore]);

  // Initialize demo workspace
  useEffect(() => {
    setRoot(createDemoWorkspace());
  }, [setRoot]);

  // Show trust dialog if workspace is not trusted
  useEffect(() => {
    if (!workspaceTrusted) {
      const timer = setTimeout(() => setShowTrustDialog(true), 500);
      return () => clearTimeout(timer);
    }
  }, [workspaceTrusted]);

  // Schedule update notification
  useEffect(() => {
    const timer = setTimeout(() => {
      addNotification({
        type: 'update',
        title: 'Update Available',
        message: 'code-server v4.90.0 is now available. You are running v4.89.0.',
        actions: [
          { label: 'Release Notes', action: () => {} },
          { label: 'Dismiss', action: () => {} },
        ],
      });
    }, 30000);
    return () => clearTimeout(timer);
  }, [addNotification]);

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

  // AI completion keyboard shortcuts (Tab to accept, Esc to dismiss)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && aiStore.currentCompletion) {
        e.preventDefault();
        const completion = aiStore.currentCompletion;
        aiStore.acceptCompletion();
        // Insert completion into active editor
        const active = useEditorStore.getState().getActiveTab();
        if (active) {
          useEditorStore.getState().updateTabContent(active.id, active.content + '\n' + completion.text);
        }
      }
      if (e.key === 'Escape' && aiStore.currentCompletion) {
        e.preventDefault();
        aiStore.dismissCompletion();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [aiStore]);

  useKeyboardShortcuts();

  // Zen mode keyboard shortcut
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

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
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
      </>
    );
  }

  return (
    <div
      className="app-container keyboard-aware"
      style={{
        display: 'flex', flexDirection: 'column',
        width: '100vw', height: '100vh',
        maxWidth: '100vw', maxHeight: '100vh',
        overflow: 'hidden',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {!zenMode && <TitleBar />}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {!zenMode && <ActivityBar />}
        {!zenMode && <Sidebar />}

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0, minHeight: 0, position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <TabBar />
            <EditorArea />
          </div>
          {!zenMode && <BottomPanel />}
          {!zenMode && <CodeExecutionPanel />}
          <AICompletionIndicator />
        </div>
      </div>

      {!zenMode && !isMobile && <StatusBar />}
      {!zenMode && isMobile && <StatusBar />}
      {!zenMode && isMobile && <MobileBottomNav />}

      <CommandPalette />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {kbShortcutsOpen && <KeyboardShortcutsPanel onClose={() => setKbShortcutsOpen(false)} />}
      <NotificationCenter />
      <ServiceHealthPanel />

      {/* Workspace Trust Dialog */}
      {showTrustDialog && !workspaceTrusted && (
        <WorkspaceTrustDialog
          onTrust={() => { setWorkspaceTrusted(true); setShowTrustDialog(false); }}
          onDismiss={() => { setShowTrustDialog(false); }}
        />
      )}

      {zenMode && (
        <div
          style={{
            position: 'fixed', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.6)', color: '#ccc', fontSize: isMobile ? 12 : 11,
            padding: '4px 12px', borderRadius: 12, zIndex: 100, cursor: 'pointer',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => settings.toggleZenMode()}
        >
          Zen Mode — Press Ctrl+K Z or tap to exit
        </div>
      )}

      {/* Run Code floating action button on mobile */}
      {isMobile && !zenMode && (
        <button
          onClick={() => {
            const active = useEditorStore.getState().getActiveTab();
            if (active?.content) {
              execStore.execute(active.content, active.path.split('.').pop() || 'plaintext');
            }
          }}
          title="Run Code"
          style={{
            position: 'fixed',
            bottom: isMobile ? 100 : 40,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: 'var(--vscode-button-bg)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            zIndex: 50,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.5 2.5l10 5.5-10 5.5V2.5z" />
          </svg>
        </button>
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
