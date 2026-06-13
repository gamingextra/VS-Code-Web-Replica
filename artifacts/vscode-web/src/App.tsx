import { useEffect } from 'react';
import { TitleBar } from '@/components/layout/TitleBar';
import { ActivityBar } from '@/components/layout/ActivityBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { TabBar } from '@/components/layout/TabBar';
import { EditorArea } from '@/components/layout/EditorArea';
import { BottomPanel } from '@/components/layout/BottomPanel';
import { StatusBar } from '@/components/layout/StatusBar';
import { CommandPalette } from '@/components/CommandPalette';
import { useFileSystemStore } from '@/store/fileSystemStore';
import { useKeyboardShortcuts, registerShortcut } from '@/hooks/useKeyboardShortcuts';
import { useSidebarStore } from '@/store/sidebarStore';
import { useTerminalStore } from '@/store/terminalStore';
import { createDemoWorkspace } from '@/data/demoWorkspace';
import { useBreakpoint } from '@/hooks/useWindowSize';

export default function App() {
  const { setRoot } = useFileSystemStore();
  const { toggle: toggleSidebar, isVisible: sidebarVisible } = useSidebarStore();
  const { togglePanel } = useTerminalStore();
  const { isMobile } = useBreakpoint();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile && sidebarVisible) {
      toggleSidebar();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // Initialize demo workspace
  useEffect(() => {
    setRoot(createDemoWorkspace());
  }, [setRoot]);

  // Register keyboard shortcuts
  useEffect(() => {
    const unsubSidebar = registerShortcut('toggleSidebar', toggleSidebar);
    const unsubPanel = registerShortcut('togglePanel', togglePanel);
    return () => {
      unsubSidebar();
      unsubPanel();
    };
  }, [toggleSidebar, togglePanel]);

  // Initialize keyboard shortcuts listener
  useKeyboardShortcuts();

  // Listen for terminal commands from menu
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
    };
    window.addEventListener('vscode:command', handler);
    return () => window.removeEventListener('vscode:command', handler);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Title Bar */}
      <TitleBar />

      {/* Main area — fills remaining height */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Activity Bar */}
        <ActivityBar />

        {/* Sidebar — overlays on mobile */}
        <Sidebar />

        {/* Editor + Panel column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {/* Tab Bar + Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <TabBar />
            <EditorArea />
          </div>

          {/* Bottom Panel */}
          <BottomPanel />
        </div>
      </div>

      {/* Status Bar — always at very bottom */}
      <StatusBar />

      <CommandPalette />
    </div>
  );
}
