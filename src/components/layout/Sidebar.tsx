'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useSidebarStore } from '@/store/sidebarStore';
import { ExplorerView } from '@/components/sidebar/ExplorerView';
import { SearchView } from '@/components/sidebar/SearchView';
import { SCMView } from '@/components/sidebar/SCMView';
import { RunDebugView } from '@/components/sidebar/RunDebugView';
import { ExtensionsView } from '@/components/sidebar/ExtensionsView';
import { useBreakpoint } from '@/hooks/useWindowSize';

const MIN_WIDTH = 120;
const MAX_WIDTH_FRACTION = 0.7;
const MOBILE_WIDTH_FRACTION = 0.85;

export function Sidebar() {
  const { isVisible, width, setWidth, activeView, toggle } = useSidebarStore();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const { isMobile, isTablet, width: vw } = useBreakpoint();

  const maxWidth = Math.floor(vw * (isMobile ? MOBILE_WIDTH_FRACTION : MAX_WIDTH_FRACTION));
  const effectiveWidth = isMobile ? Math.min(Math.max(vw * 0.8, 240), maxWidth) : Math.min(Math.max(width, MIN_WIDTH), maxWidth);

  const isOverlay = isMobile;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isOverlay) return;
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = effectiveWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      const maxW = Math.floor(window.innerWidth * (isMobile ? MOBILE_WIDTH_FRACTION : MAX_WIDTH_FRACTION));
      setWidth(Math.min(Math.max(newWidth, MIN_WIDTH), maxW));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [effectiveWidth, isOverlay, setWidth, isMobile]);

  // Touch resize support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isOverlay) return;
    e.preventDefault();
    setIsResizing(true);
    const startX = e.touches[0].clientX;
    const startWidth = effectiveWidth;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const newWidth = startWidth + (moveEvent.touches[0].clientX - startX);
      const maxW = Math.floor(window.innerWidth * (isMobile ? MOBILE_WIDTH_FRACTION : MAX_WIDTH_FRACTION));
      setWidth(Math.min(Math.max(newWidth, MIN_WIDTH), maxW));
    };

    const handleTouchEnd = () => {
      setIsResizing(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  }, [effectiveWidth, isOverlay, setWidth, isMobile]);

  useEffect(() => {
    if (!isOverlay || !isVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOverlay, isVisible, toggle]);

  // Close sidebar on outside click on mobile
  useEffect(() => {
    if (!isOverlay || !isVisible) return;
    // Handled by backdrop click
  }, [isOverlay, isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {isOverlay && (
        <div
          onClick={toggle}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 40,
          }}
        />
      )}

      <div
        ref={sidebarRef}
        style={{
          width: effectiveWidth,
          backgroundColor: 'var(--vscode-sidebar-bg)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: isOverlay ? 'fixed' : 'relative',
          top: isOverlay ? 0 : undefined,
          bottom: isOverlay ? 0 : undefined,
          left: isOverlay ? 0 : undefined,
          zIndex: isOverlay ? 50 : undefined,
          userSelect: 'none',
          boxShadow: isOverlay ? '4px 0 16px rgba(0,0,0,0.4)' : undefined,
          animation: isOverlay ? 'slideInLeft 0.2s ease-out' : undefined,
        }}
      >
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {activeView === 'explorer' && <ExplorerView />}
          {activeView === 'search' && <SearchView />}
          {activeView === 'scm' && <SCMView />}
          {activeView === 'run' && <RunDebugView />}
          {activeView === 'extensions' && <ExtensionsView />}
        </div>

        {!isOverlay && (
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 4,
              cursor: 'col-resize',
              zIndex: 10,
              backgroundColor: isResizing ? 'var(--vscode-sash-hover)' : 'transparent',
              transition: isResizing ? 'none' : 'background-color 0.15s',
            }}
          />
        )}

        {/* Close button on mobile overlay */}
        {isOverlay && (
          <button
            onClick={toggle}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)',
              border: 'none',
              borderRadius: 4,
              color: 'var(--vscode-fg)',
              cursor: 'pointer',
              fontSize: 16,
              zIndex: 20,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
