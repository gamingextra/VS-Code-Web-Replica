'use client';

import { useSidebarStore } from '@/store/sidebarStore';
import type { SidebarView } from '@/store/sidebarStore';
import {
  Files,
  Search,
  GitBranch,
  Play,
  Puzzle,
  User,
  Settings,
} from 'lucide-react';

const VIEW_ITEMS: { view: SidebarView; icon: React.FC<{ size?: number; className?: string }>; tooltip: string }[] = [
  { view: 'explorer', icon: Files, tooltip: 'Explorer (Ctrl+Shift+E)' },
  { view: 'search', icon: Search, tooltip: 'Search (Ctrl+Shift+F)' },
  { view: 'scm', icon: GitBranch, tooltip: 'Source Control (Ctrl+Shift+G)' },
  { view: 'run', icon: Play, tooltip: 'Run and Debug (Ctrl+Shift+D)' },
  { view: 'extensions', icon: Puzzle, tooltip: 'Extensions (Ctrl+Shift+X)' },
];

export function ActivityBar() {
  const { activeView, isVisible, setView } = useSidebarStore();

  const handleClick = (view: SidebarView) => {
    setView(view);
  };

  return (
    <div
      style={{
        width: 48,
        backgroundColor: 'var(--vscode-activityBar-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 4,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
        {VIEW_ITEMS.map(({ view, icon: Icon, tooltip }) => {
          const isActive = isVisible && activeView === view;
          return (
            <button
              key={view}
              title={tooltip}
              onClick={() => handleClick(view)}
              style={{
                position: 'relative',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--vscode-activityBar-active)' : '#858585',
                transition: 'color 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#cccccc';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = '#858585';
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 8,
                    bottom: 8,
                    width: 2,
                    backgroundColor: 'var(--vscode-activityBar-activeBorder)',
                    borderRadius: '0 1px 1px 0',
                  }}
                />
              )}
              <Icon size={24} />
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 4 }}>
        <button
          title="Accounts"
          style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#858585',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#cccccc')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#858585')}
        >
          <User size={24} />
        </button>
        <button
          title="Manage"
          style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#858585',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#cccccc')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#858585')}
        >
          <Settings size={24} />
        </button>
      </div>
    </div>
  );
}
