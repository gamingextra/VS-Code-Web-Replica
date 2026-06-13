import { useRef, useState, useCallback, useEffect } from 'react';
import { useSidebarStore } from '@/store/sidebarStore';
import { ExplorerView } from '@/components/sidebar/ExplorerView';
import { SearchView } from '@/components/sidebar/SearchView';
import { SCMView } from '@/components/sidebar/SCMView';
import { RunDebugView } from '@/components/sidebar/RunDebugView';
import { ExtensionsView } from '@/components/sidebar/ExtensionsView';
import { useBreakpoint } from '@/hooks/useWindowSize';

const MIN_WIDTH = 120;
const MAX_WIDTH_FRACTION = 0.7; // max 70vw

export function Sidebar() {
  const { isVisible, width, setWidth, activeView, toggle } = useSidebarStore();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const { isMobile, width: vw } = useBreakpoint();

  // Clamp stored width to safe viewport-relative bounds
  const maxWidth = Math.floor(vw * MAX_WIDTH_FRACTION);
  const effectiveWidth = Math.min(Math.max(width, MIN_WIDTH), maxWidth);

  // On mobile the sidebar floats over content
  const isOverlay = isMobile;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isOverlay) return;
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = effectiveWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      setWidth(Math.min(Math.max(newWidth, MIN_WIDTH), maxWidth));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [effectiveWidth, maxWidth, isOverlay, setWidth]);

  // Close on Escape when overlay
  useEffect(() => {
    if (!isOverlay || !isVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOverlay, isVisible, toggle]);

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop on mobile — tap to close */}
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
          left: isOverlay ? 48 : undefined,
          zIndex: isOverlay ? 50 : undefined,
          userSelect: 'none',
          boxShadow: isOverlay ? '4px 0 16px rgba(0,0,0,0.4)' : undefined,
        }}
      >
        {/* Sidebar content */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {activeView === 'explorer' && <ExplorerView />}
          {activeView === 'search' && <SearchView />}
          {activeView === 'scm' && <SCMView />}
          {activeView === 'run' && <RunDebugView />}
          {activeView === 'extensions' && <ExtensionsView />}
        </div>

        {/* Resize sash — desktop only */}
        {!isOverlay && (
          <div
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 4,
              cursor: 'col-resize',
              zIndex: 10,
              backgroundColor: isResizing ? 'var(--vscode-sash-hover)' : 'transparent',
            }}
          />
        )}
      </div>
    </>
  );
}
