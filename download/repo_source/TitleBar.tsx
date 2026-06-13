import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useWindowSize } from '@/hooks/useWindowSize';

interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
}

interface MenuDef {
  name: string;
  items: MenuItem[];
}

export function TitleBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLDivElement>(null);
  const { width } = useWindowSize();

  // On narrow screens, hide some menus to save space
  const showAllMenus = width >= 640;
  const showSomeMenus = width >= 400;

  // Action handlers
  const handleNewFile = () => {
    const id = useEditorStore.getState().newUntitled();
    useEditorStore.getState().setActiveTab(id);
    setActiveMenu(null);
  };

  const handleSave = () => {
    const active = useEditorStore.getState().getActiveTab();
    if (active) useEditorStore.getState().markClean(active.id);
    setActiveMenu(null);
  };

  const handleSaveAs = () => {
    const active = useEditorStore.getState().getActiveTab();
    if (active) {
      const blob = new Blob([active.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = active.name;
      a.click();
      URL.revokeObjectURL(url);
    }
    setActiveMenu(null);
  };

  const handleOpenFolder = () => {
    showToast('Open Folder not implemented in web');
    setActiveMenu(null);
  };

  const handleUndo = () => {
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'undo' } }));
    setActiveMenu(null);
  };

  const handleRedo = () => {
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'redo' } }));
    setActiveMenu(null);
  };

  const handleFind = () => {
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'find' } }));
    setActiveMenu(null);
  };

  const handleReplace = () => {
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'replace' } }));
    setActiveMenu(null);
  };

  const handleSelectAll = () => {
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'selectAll' } }));
    setActiveMenu(null);
  };

  const handleCommandPalette = () => {
    setActiveMenu(null);
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'commandPalette' } }));
  };

  const handleToggleSidebar = () => {
    useSidebarStore.getState().toggle();
    setActiveMenu(null);
  };

  const handleTogglePanel = () => {
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'togglePanel' } }));
    setActiveMenu(null);
  };

  const handleToggleTerminal = () => {
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'toggleTerminal' } }));
    setActiveMenu(null);
  };

  const handleStartDebugging = () => {
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'startDebugging' } }));
    setActiveMenu(null);
  };

  const handleNewTerminal = () => {
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'newTerminal' } }));
    setActiveMenu(null);
  };

  const handleNewWindow = () => { showToast('New Window not available in web'); setActiveMenu(null); };

  const handleOpenFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => { showToast('File upload not implemented'); };
    input.click();
    setActiveMenu(null);
  };

  const handleExit = () => setActiveMenu(null);

  const handleClipboard = (type: string) => () => {
    showToast(`${type} — use browser shortcut`);
    setActiveMenu(null);
  };

  const handleGoToFile = () => {
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'commandPalette' } }));
    setActiveMenu(null);
  };

  const handleGoToLine = () => { showToast('Go to Line not implemented'); setActiveMenu(null); };

  const handleRunWithoutDebug = () => {
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'startDebugging' } }));
    setActiveMenu(null);
  };

  const handleStopDebugging = () => { showToast('No active debug session'); setActiveMenu(null); };

  const handleWelcome = () => {
    window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'welcome' } }));
    setActiveMenu(null);
  };

  const handleViewSidebar = (view: 'explorer' | 'search' | 'scm' | 'run' | 'extensions') => () => {
    useSidebarStore.getState().setView(view);
    useSidebarStore.getState().show();
    setActiveMenu(null);
  };

  const ALL_MENUS: MenuDef[] = [
    {
      name: 'File',
      items: [
        { label: 'New File', shortcut: 'Ctrl+N', action: handleNewFile },
        { label: 'New Window', shortcut: 'Ctrl+Shift+N', action: handleNewWindow },
        { separator: true },
        { label: 'Open File...', shortcut: 'Ctrl+O', action: handleOpenFile },
        { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: handleOpenFolder },
        { separator: true },
        { label: 'Save', shortcut: 'Ctrl+S', action: handleSave },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: handleSaveAs },
        { separator: true },
        { label: 'Exit', action: handleExit },
      ],
    },
    {
      name: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: handleUndo },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: handleRedo },
        { separator: true },
        { label: 'Cut', shortcut: 'Ctrl+X', action: handleClipboard('Cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', action: handleClipboard('Copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', action: handleClipboard('Paste') },
        { separator: true },
        { label: 'Find', shortcut: 'Ctrl+F', action: handleFind },
        { label: 'Replace', shortcut: 'Ctrl+H', action: handleReplace },
        { separator: true },
        { label: 'Select All', shortcut: 'Ctrl+A', action: handleSelectAll },
      ],
    },
    {
      name: 'Selection',
      items: [
        { label: 'Select All', shortcut: 'Ctrl+A', action: handleSelectAll },
        { label: 'Copy Line Up', shortcut: 'Shift+Alt+Up' },
        { label: 'Copy Line Down', shortcut: 'Shift+Alt+Down' },
        { label: 'Move Line Up', shortcut: 'Alt+Up' },
        { label: 'Move Line Down', shortcut: 'Alt+Down' },
      ],
    },
    {
      name: 'View',
      items: [
        { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: handleCommandPalette },
        { separator: true },
        { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: handleViewSidebar('explorer') },
        { label: 'Search', shortcut: 'Ctrl+Shift+F', action: handleViewSidebar('search') },
        { label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: handleViewSidebar('scm') },
        { label: 'Run', shortcut: 'Ctrl+Shift+D', action: handleViewSidebar('run') },
        { label: 'Extensions', shortcut: 'Ctrl+Shift+X', action: handleViewSidebar('extensions') },
        { separator: true },
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: handleToggleSidebar },
        { label: 'Toggle Panel', shortcut: 'Ctrl+J', action: handleTogglePanel },
        { label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: handleToggleTerminal },
      ],
    },
    {
      name: 'Go',
      items: [
        { label: 'Go to File...', shortcut: 'Ctrl+P', action: handleGoToFile },
        { label: 'Go to Line...', shortcut: 'Ctrl+G', action: handleGoToLine },
      ],
    },
    {
      name: 'Run',
      items: [
        { label: 'Start Debugging', shortcut: 'F5', action: handleStartDebugging },
        { label: 'Run Without Debugging', shortcut: 'Ctrl+F5', action: handleRunWithoutDebug },
        { label: 'Stop Debugging', shortcut: 'Shift+F5', action: handleStopDebugging },
      ],
    },
    {
      name: 'Terminal',
      items: [
        { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: handleNewTerminal },
      ],
    },
    {
      name: 'Help',
      items: [
        { label: 'Welcome', action: handleWelcome },
        { label: 'Show All Commands', shortcut: 'Ctrl+Shift+P', action: handleCommandPalette },
      ],
    },
  ];

  // On narrow screens: show only core menus
  const MENU_DEFS = showAllMenus
    ? ALL_MENUS
    : showSomeMenus
      ? ALL_MENUS.filter((m) => ['File', 'Edit', 'View', 'Terminal', 'Help'].includes(m.name))
      : ALL_MENUS.filter((m) => ['File', 'View', 'Terminal'].includes(m.name));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        menuButtonRef.current && !menuButtonRef.current.contains(e.target as Node)
      ) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--vscode-titleBar-bg)',
        color: 'var(--vscode-titleBar-activeFg)',
        fontSize: 13,
        fontWeight: 400,
        flexShrink: 0,
        userSelect: 'none',
        zIndex: 100,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Menu buttons — scrollable on very narrow */}
      <div
        ref={menuButtonRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          flexShrink: 1,
          minWidth: 0,
        }}
      >
        {MENU_DEFS.map((menu) => (
          <div key={menu.name} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setActiveMenu(activeMenu === menu.name ? null : menu.name)}
              style={{
                padding: '4px 8px',
                background: activeMenu === menu.name ? 'var(--vscode-menu-hover)' : 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 400,
                fontFamily: 'inherit',
                borderRadius: 4,
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={() => {
                if (activeMenu && activeMenu !== menu.name) setActiveMenu(menu.name);
              }}
            >
              {menu.name}
            </button>

            {/* Dropdown */}
            {activeMenu === menu.name && (
              <div
                ref={menuRef}
                style={{
                  position: 'fixed',
                  top: 28,
                  backgroundColor: 'var(--vscode-menu-bg)',
                  border: '1px solid var(--vscode-border)',
                  borderRadius: 4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  zIndex: 1000,
                  minWidth: 200,
                  padding: '4px 0',
                  fontSize: 13,
                  fontWeight: 400,
                  maxHeight: 'calc(100vh - 40px)',
                  overflowY: 'auto',
                }}
              >
                {menu.items.map((item, idx) =>
                  item.separator ? (
                    <div
                      key={idx}
                      style={{ height: 1, backgroundColor: 'var(--vscode-border)', margin: '4px 0' }}
                    />
                  ) : (
                    <div
                      key={idx}
                      onClick={item.action}
                      style={{
                        padding: '5px 16px',
                        cursor: item.action ? 'pointer' : 'default',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 24,
                        whiteSpace: 'nowrap',
                        color: 'var(--vscode-fg)',
                        opacity: item.action ? 1 : 0.5,
                      }}
                      onMouseEnter={(e) => {
                        if (item.action) e.currentTarget.style.backgroundColor = 'var(--vscode-menu-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 'auto', fontFamily: '"Cascadia Code", monospace' }}>
                          {item.shortcut}
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function showToast(msg: string) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:40px;left:50%;transform:translateX(-50%);background:#252526;color:#ccc;padding:8px 16px;border-radius:4px;font-size:13px;z-index:9999;border:1px solid #454545;pointer-events:none';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}
