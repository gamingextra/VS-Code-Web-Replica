'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useBreakpoint } from '@/hooks/useWindowSize';
import { CloseIcon, AddIcon } from '@/components/icons';

export function TabBar() {
  const { tabs, splits, activeSplitIndex, activeTabId, setActiveTab, closeTab, newUntitled } = useEditorStore();
  const { isMobile, isTablet } = useBreakpoint();

  const activeSplit = splits[activeSplitIndex];
  const splitTabIds = activeSplit?.tabIds ?? [];
  const visibleTabs = splitTabIds.length > 0
    ? tabs.filter((t) => splitTabIds.includes(t.id))
    : tabs;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [overflowTabs, setOverflowTabs] = useState<typeof visibleTabs>([]);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabMaxWidth = isMobile ? 120 : isTablet ? 150 : 180;
  const tabMinWidth = isMobile ? 50 : 60;
  const tabHeight = isMobile ? 38 : 35;

  // Long press handler for mobile tab close - defined before early return
  const handleTouchStart = useCallback((tabId: string) => (e: React.TouchEvent) => {
    if (!isMobile) return;
    longPressTimerRef.current = setTimeout(() => {
      closeTab(tabId);
    }, 600);
  }, [isMobile, closeTab]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Compute overflow tabs from the DOM (called in event handlers, not effects)
  const computeOverflowTabs = useCallback(() => {
    if (!scrollRef.current) return [];
    const container = scrollRef.current;
    const containerRect = container.getBoundingClientRect();
    const overTabs: typeof visibleTabs = [];
    container.querySelectorAll('[data-tab-id]').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > containerRect.right || rect.left < containerRect.left) {
        const tabId = el.getAttribute('data-tab-id');
        const tab = visibleTabs.find(t => t.id === tabId);
        if (tab) overTabs.push(tab);
      }
    });
    return overTabs;
  }, [visibleTabs]);

  // Check if tabs overflow
  useEffect(() => {
    const checkOverflow = () => {
      if (scrollRef.current) {
        setShowOverflow(scrollRef.current.scrollWidth > scrollRef.current.clientWidth);
      }
    };
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [visibleTabs.length]);

  // Handle overflow button click - compute overflow tabs on demand
  const handleOverflowClick = useCallback(() => {
    const overTabs = computeOverflowTabs();
    setOverflowTabs(overTabs);
    setOverflowMenuOpen(prev => !prev);
  }, [computeOverflowTabs]);

  if (visibleTabs.length === 0) return null;

  return (
    <div
      style={{
        height: tabHeight,
        backgroundColor: 'var(--vscode-tab-bg)',
        display: 'flex',
        alignItems: 'flex-end',
        flexShrink: 0,
        userSelect: 'none',
        position: 'relative',
      }}
    >
      <div
        ref={scrollRef}
        className="tabs-scroll"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          overflowX: 'auto',
          overflowY: 'hidden',
          flex: 1,
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
        }}
      >
        {visibleTabs.map((tab) => {
          const isActive = tab.id === (activeSplit?.activeTabId ?? activeTabId);
          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onTouchStart={handleTouchStart(tab.id)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: tabHeight,
                padding: isMobile ? '0 8px 0 10px' : '0 6px 0 10px',
                backgroundColor: isActive ? 'var(--vscode-tab-activeBg)' : 'var(--vscode-tab-bg)',
                borderRight: '1px solid var(--vscode-tab-border)',
                borderTop: isActive ? '1px solid var(--vscode-focusBorder)' : '1px solid transparent',
                color: isActive ? 'var(--vscode-editor-fg)' : 'var(--vscode-fg)',
                fontSize: isMobile ? 12 : 13,
                fontWeight: isActive ? 500 : 400,
                cursor: 'pointer',
                maxWidth: tabMaxWidth,
                minWidth: tabMinWidth,
                flexShrink: 0,
                gap: 5,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: tab.isDirty ? 'var(--vscode-fg)' : 'transparent',
                  flexShrink: 0,
                  opacity: 0.8,
                  width: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tab.isDirty ? '●' : ''}
              </span>
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontStyle: tab.path.startsWith('Untitled') ? 'italic' : 'normal',
                  minWidth: 0,
                }}
              >
                {tab.name}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                style={{
                  width: isMobile ? 24 : 16,
                  height: isMobile ? 24 : 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  borderRadius: 3,
                  flexShrink: 0,
                  opacity: 0.6,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--vscode-button-bg)'; e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.opacity = '0.6'; }}
              >
                <CloseIcon size={isMobile ? 16 : 14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* New file button */}
      <button
        onClick={newUntitled}
        title="New File (Ctrl+N)"
        style={{
          width: tabHeight,
          height: tabHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          color: 'var(--vscode-fg)',
          cursor: 'pointer',
          flexShrink: 0,
          opacity: 0.6,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
      >
        <AddIcon size={16} />
      </button>

      {/* Overflow button */}
      {showOverflow && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={handleOverflowClick}
            style={{
              width: tabHeight,
              height: tabHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: 'var(--vscode-fg)',
              cursor: 'pointer',
              opacity: 0.6,
              fontSize: 16,
              fontWeight: 700,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
          >
            …
          </button>

          {overflowMenuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOverflowMenuOpen(false)} />
              <div
                style={{
                  position: 'absolute',
                  top: tabHeight,
                  right: 0,
                  backgroundColor: 'var(--vscode-dropdown-bg)',
                  border: '1px solid var(--vscode-border)',
                  borderRadius: 4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  zIndex: 10000,
                  minWidth: 160,
                  maxHeight: '50vh',
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {overflowTabs.map((tab) => (
                  <div
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setOverflowMenuOpen(false); }}
                    style={{
                      padding: isMobile ? '10px 16px' : '5px 12px',
                      fontSize: isMobile ? 13 : 12,
                      cursor: 'pointer',
                      color: 'var(--vscode-fg)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      whiteSpace: 'nowrap',
                      minHeight: isMobile ? 44 : undefined,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--vscode-list-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.name}</span>
                    {tab.isDirty && <span style={{ fontSize: 9, opacity: 0.7 }}>●</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
