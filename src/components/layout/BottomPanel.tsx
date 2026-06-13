'use client';

import { useState, useCallback, useRef } from 'react';
import { useTerminalStore } from '@/store/terminalStore';
import { Terminal } from '@/components/terminal/Terminal';
import { ProblemsPanel } from '@/components/panel/ProblemsPanel';
import { OutputPanel } from '@/components/panel/OutputPanel';
import { DebugConsolePanel } from '@/components/panel/DebugConsolePanel';
import { PortsPanel } from '@/components/panel/PortsPanel';
import { TerminalIcon, ProblemsIcon, OutputIcon, DebugConsoleIcon } from '@/components/icons';
import { useBreakpoint } from '@/hooks/useWindowSize';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

type PanelTab = 'terminal' | 'problems' | 'output' | 'debugConsole' | 'ports';

const PANEL_TABS: { id: PanelTab; icon: React.FC<{ size?: number }>; label: string; shortLabel: string }[] = [
  { id: 'terminal', icon: TerminalIcon, label: 'TERMINAL', shortLabel: 'TERM' },
  { id: 'problems', icon: ProblemsIcon, label: 'PROBLEMS', shortLabel: 'PROB' },
  { id: 'output', icon: OutputIcon, label: 'OUTPUT', shortLabel: 'OUT' },
  { id: 'debugConsole', icon: DebugConsoleIcon, label: 'DEBUG CONSOLE', shortLabel: 'DEBUG' },
  { id: 'ports', icon: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.5A1.5 1.5 0 012.5 2h11A1.5 1.5 0 0115 3.5v9a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9zM2.5 3a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h11a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-11zM5 6.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM6.5 5.5a.5.5 0 100 1 .5.5 0 000-1z"/></svg>, label: 'PORTS', shortLabel: 'PORTS' },
];

const MIN_HEIGHT = 80;
const DEFAULT_HEIGHT = 200;

export function BottomPanel() {
  const terminalStore = useTerminalStore();
  const activePanelTab = terminalStore.activePanelTab as PanelTab;
  const setActivePanelTab = (tab: PanelTab) => {
    terminalStore.setActivePanelTab(tab as 'terminal' | 'problems' | 'output' | 'debugConsole');
  };
  const showPanel = terminalStore.showPanel;
  const [isResizing, setIsResizing] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const { isMobile, isTablet, height: vh, isLandscape } = useBreakpoint();

  // Mobile default: 40% of viewport height
  const mobileDefaultHeight = Math.floor(vh * 0.4);
  const maxHeight = Math.floor(vh * 0.6);
  const effectiveHeight = isMobile
    ? Math.min(height, Math.floor(vh * 0.5))
    : Math.min(Math.max(height, MIN_HEIGHT), maxHeight);

  // Swipe down on header to dismiss panel
  useSwipeGesture(headerRef, {
    onSwipeDown: () => {
      if (isMobile && showPanel) {
        terminalStore.togglePanel();
      }
    },
    minDistance: 60,
    minVelocity: 0.2,
  });

  // Auto-collapse in landscape mobile
  const shouldCollapseLandscape = isMobile && isLandscape;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = effectiveHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = startHeight - delta;
      const maxH = Math.floor(window.innerHeight * (isMobile ? 0.5 : 0.6));
      setHeight(Math.min(Math.max(newHeight, MIN_HEIGHT), maxH));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [effectiveHeight, isMobile]);

  // Touch resize support with larger handle on mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.touches[0].clientY;
    const startHeight = effectiveHeight;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const delta = moveEvent.touches[0].clientY - startY;
      const newHeight = startHeight - delta;
      const maxH = Math.floor(window.innerHeight * (isMobile ? 0.5 : 0.6));
      setHeight(Math.min(Math.max(newHeight, MIN_HEIGHT), maxH));
    };

    const handleTouchEnd = () => {
      setIsResizing(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  }, [effectiveHeight, isMobile]);

  if (!showPanel || shouldCollapseLandscape) return null;

  const tabHeight = isMobile ? 36 : 35;
  const showLabels = !isMobile;
  const resizeHandleHeight = isMobile ? 12 : 6;
  const resizeHandleTop = isMobile ? -6 : -3;

  return (
    <div
      ref={panelRef}
      style={{
        height: effectiveHeight,
        backgroundColor: 'var(--vscode-panel-bg)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        borderTop: '1px solid var(--vscode-panel-border)',
        minHeight: MIN_HEIGHT,
      }}
      className={isMobile ? 'safe-area-bottom' : undefined}
    >
      {/* Resize handle - larger on mobile for better touch targets */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          position: 'absolute',
          top: resizeHandleTop,
          left: 0,
          right: 0,
          height: resizeHandleHeight,
          cursor: 'row-resize',
          zIndex: 10,
          backgroundColor: isResizing ? 'var(--vscode-sash-hover)' : 'transparent',
          transition: isResizing ? 'none' : 'background-color 0.15s',
          // Visual feedback: show a subtle line when not resizing on mobile
          ...(isMobile && !isResizing ? {
            '::after': undefined, // Cannot use pseudo-elements in inline styles
          } : {}),
        }}
      >
        {/* Visual indicator for the resize handle on mobile */}
        {isMobile && !isResizing && (
          <div style={{
            position: 'absolute',
            top: 5,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 32,
            height: 3,
            borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.15)',
          }} />
        )}
      </div>

      <div
        ref={headerRef}
        style={{
          height: tabHeight,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 4,
          paddingRight: 4,
          gap: 0,
          userSelect: 'none',
          borderBottom: '1px solid var(--vscode-panel-border)',
          flexShrink: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {PANEL_TABS.map(({ id, icon: Icon, label, shortLabel }) => (
          <button
            key={id}
            onClick={() => setActivePanelTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 3 : 4,
              height: isMobile ? 44 : tabHeight, // 44px min-height on mobile for touch
              padding: isMobile ? '0 6px' : '0 8px',
              background: 'transparent',
              border: 'none',
              borderBottom: activePanelTab === id ? '1px solid var(--vscode-focusBorder)' : '1px solid transparent',
              marginBottom: -1,
              color: 'var(--vscode-fg)',
              opacity: activePanelTab === id ? 1 : 0.6,
              cursor: 'pointer',
              fontSize: isMobile ? 10 : 11,
              fontWeight: 700,
              letterSpacing: 0.3,
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              minHeight: isMobile ? 44 : undefined,
            }}
          >
            <Icon size={isMobile ? 16 : 14} />
            <span>{isMobile ? shortLabel : label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
        {activePanelTab === 'terminal' && <Terminal />}
        {activePanelTab === 'problems' && <ProblemsPanel />}
        {activePanelTab === 'output' && <OutputPanel />}
        {activePanelTab === 'debugConsole' && <DebugConsolePanel />}
        {activePanelTab === 'ports' && <PortsPanel />}
      </div>
    </div>
  );
}
