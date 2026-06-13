'use client';

import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useAuthStore } from '@/store/authStore';
import { useBreakpoint } from '@/hooks/useWindowSize';
import { Menu, X } from 'lucide-react';

interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
}

interface MenuDef {
  name: string;
  icon?: string;
  items: MenuItem[];
}

function showToast(msg: string) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:40px;left:50%;transform:translateX(-50%);background:#252526;color:#ccc;padding:8px 16px;border-radius:4px;font-size:13px;z-index:9999;border:1px solid #454545;pointer-events:none';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

export function TitleBar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { isMobile, isSmallMobile } = useBreakpoint();

  const handleNewFile = () => {
    const id = useEditorStore.getState().newUntitled();
    useEditorStore.getState().setActiveTab(id);
    setActiveMenu(null);
    setMobileMenuOpen(false);
  };

  const handleSave = () => {
    const active = useEditorStore.getState().getActiveTab();
    if (active) useEditorStore.getState().markClean(active.id);
    setActiveMenu(null);
    setMobileMenuOpen(false);
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
    setMobileMenuOpen(false);
  };

  const handleOpenFolder = () => { showToast('Open Folder not implemented in web'); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleUndo = () => { window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'undo' } })); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleRedo = () => { window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'redo' } })); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleFind = () => { window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'find' } })); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleReplace = () => { window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'replace' } })); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleSelectAll = () => { window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'selectAll' } })); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleCommandPalette = () => { setActiveMenu(null); setMobileMenuOpen(false); window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'commandPalette' } })); };
  const handleToggleSidebar = () => { useSidebarStore.getState().toggle(); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleTogglePanel = () => { window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'togglePanel' } })); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleToggleTerminal = () => { window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'toggleTerminal' } })); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleStartDebugging = () => { window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'startDebugging' } })); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleNewTerminal = () => { window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'newTerminal' } })); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleNewWindow = () => { showToast('New Window not available in web'); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleOpenFile = () => { showToast('File upload not implemented'); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleExit = () => { setActiveMenu(null); setMobileMenuOpen(false); };
  const handleClipboard = (type: string) => () => { showToast(`${type} — use browser shortcut`); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleGoToFile = () => { window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'commandPalette' } })); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleGoToLine = () => { showToast('Go to Line not implemented'); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleRunWithoutDebug = () => { window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'startDebugging' } })); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleStopDebugging = () => { showToast('No active debug session'); setActiveMenu(null); setMobileMenuOpen(false); };
  const handleWelcome = () => { window.dispatchEvent(new CustomEvent('vscode:command', { detail: { command: 'welcome' } })); setActiveMenu(null); setMobileMenuOpen(false); };

  const handleViewSidebar = (view: 'explorer' | 'search' | 'scm' | 'run' | 'extensions') => () => {
    useSidebarStore.getState().setView(view);
    useSidebarStore.getState().show();
    setActiveMenu(null);
    setMobileMenuOpen(false);
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
        { separator: true },
        { label: 'About code-server', action: () => { showToast('code-server v4.89.0 - Running on 127.0.0.1:8080'); setActiveMenu(null); setMobileMenuOpen(false); } },
        { separator: true },
        { label: 'Sign Out', action: () => { useAuthStore.getState().logout(); setActiveMenu(null); setMobileMenuOpen(false); } },
      ],
    },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        menuButtonRef.current && !menuButtonRef.current.contains(e.target as Node)
      ) {
        setActiveMenu(null);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mobile: hamburger menu with slide-in panel
  if (isMobile) {
    return (
      <>
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
            height: 44, // 44px to match iOS HIG
            paddingLeft: 4,
            paddingRight: 4,
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
          className="safe-area-top title-bar-mobile"
        >
          {/* Hamburger button - 44x44 touch target */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Menu size={20} />
          </button>

          {/* Title */}
          <div style={{ flex: 1, textAlign: 'center', fontSize: 13, opacity: 0.8, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', minWidth: 0 }}>
            workspace - code-server
          </div>

          {/* Remote indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, opacity: 0.9 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.287 6.783l-.8-.8A4.784 4.784 0 018 3.5c1.78 0 3.35.975 4.188 2.433l-.866.5A3.784 3.784 0 008 4.5a3.784 3.784 0 00-3.713 2.283zm1.6 1.6l-.8-.8A2.79 2.79 0 018 6.5c1.04 0 1.94.57 2.413 1.413l-.866.5A1.79 1.79 0 008 7.5a1.79 1.79 0 00-1.113.883zM8 10a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <>
            <div
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 200,
              }}
            />
            <div
              ref={mobileMenuRef}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: isSmallMobile ? '85vw' : 280,
                maxWidth: 320,
                backgroundColor: 'var(--vscode-menu-bg)',
                borderRight: '1px solid var(--vscode-border)',
                zIndex: 210,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'slideInLeft 0.2s ease-out',
              }}
            >
              {/* Mobile menu header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--vscode-border)', flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--vscode-fg)' }}>Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--vscode-fg)', cursor: 'pointer', borderRadius: 4 }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Menu items */}
              <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {ALL_MENUS.map((menu) => (
                  <div key={menu.name}>
                    <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--vscode-fg)', opacity: 0.5 }}>
                      {menu.name}
                    </div>
                    {menu.items.map((item, idx) =>
                      item.separator ? (
                        <div key={idx} style={{ height: 1, backgroundColor: 'var(--vscode-border)', margin: '4px 16px' }} />
                      ) : (
                        <button
                          key={idx}
                          onClick={item.action}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            padding: '10px 16px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--vscode-fg)',
                            fontSize: 14,
                            fontFamily: 'inherit',
                            cursor: item.action ? 'pointer' : 'default',
                            opacity: item.action ? 1 : 0.5,
                            textAlign: 'left',
                          }}
                          onTouchStart={(e) => {
                            if (item.action) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--vscode-list-hover)';
                          }}
                          onTouchEnd={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
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
                            <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 16, fontFamily: 'monospace', flexShrink: 0 }}>
                              {item.shortcut}
                            </span>
                          )}
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <style>{`
          @keyframes slideInLeft {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
        `}</style>
      </>
    );
  }

  // Desktop title bar
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
        height: 30,
      }}
    >
      {/* code-server remote indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 8px',
          fontSize: 12,
          color: 'var(--vscode-titleBar-activeFg)',
          flexShrink: 0,
          opacity: 0.9,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.287 6.783l-.8-.8A4.784 4.784 0 018 3.5c1.78 0 3.35.975 4.188 2.433l-.866.5A3.784 3.784 0 008 4.5a3.784 3.784 0 00-3.713 2.283zm1.6 1.6l-.8-.8A2.79 2.79 0 018 6.5c1.04 0 1.94.57 2.413 1.413l-.866.5A1.79 1.79 0 008 7.5a1.79 1.79 0 00-1.113.883zM8 10a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      </div>
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
        {ALL_MENUS.map((menu) => (
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

            {activeMenu === menu.name && (
              <div
                ref={menuRef}
                style={{
                  position: 'fixed',
                  top: 30,
                  backgroundColor: 'var(--vscode-menu-bg)',
                  border: '1px solid var(--vscode-border)',
                  borderRadius: 4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  zIndex: 1000,
                  minWidth: 200,
                  maxWidth: '90vw',
                  padding: '4px 0',
                  fontSize: 13,
                  fontWeight: 400,
                  maxHeight: 'calc(100vh - 40px)',
                  overflowY: 'auto',
                }}
              >
                {menu.items.map((item, idx) =>
                  item.separator ? (
                    <div key={idx} style={{ height: 1, backgroundColor: 'var(--vscode-border)', margin: '4px 0' }} />
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
                        <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 'auto', fontFamily: 'monospace' }}>
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

      {/* Title with code-server branding */}
      <div
        style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 12,
          opacity: 0.7,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          minWidth: 0,
        }}
      >
        workspace - code-server
      </div>
    </div>
  );
}
