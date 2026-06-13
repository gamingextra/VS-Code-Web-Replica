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

export default function App() {
  const { setRoot } = useFileSystemStore();
  const { toggle: toggleSidebar } = useSidebarStore();
  const { togglePanel } = useTerminalStore();

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
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Title Bar */}
      <TitleBar />

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Activity Bar */}
        <ActivityBar />

        {/* Sidebar */}
        <Sidebar />

        {/* Editor + Panel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Tab Bar + Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <TabBar />
            <EditorArea />
          </div>

          {/* Bottom Panel */}
          <BottomPanel />

          {/* Status Bar */}
          <StatusBar />
        </div>
      </div>

      <CommandPalette />
    </div>
  );
}
