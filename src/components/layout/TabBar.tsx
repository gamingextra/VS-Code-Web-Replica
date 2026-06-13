'use client';

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

  if (visibleTabs.length === 0) return null;

  const tabMaxWidth = isMobile ? 120 : isTablet ? 150 : 180;
  const tabMinWidth = isMobile ? 50 : 60;
  const tabHeight = isMobile ? 38 : 35;

  return (
    <div
      className="tabs-scroll"
      style={{
        height: tabHeight,
        backgroundColor: 'var(--vscode-tab-bg)',
        display: 'flex',
        alignItems: 'flex-end',
        overflowX: 'auto',
        overflowY: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
        scrollbarWidth: 'thin',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {visibleTabs.map((tab) => {
        const isActive = tab.id === (activeSplit?.activeTabId ?? activeTabId);
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
    </div>
  );
}
