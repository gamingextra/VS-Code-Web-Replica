'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotificationStore, type Notification } from '@/store/notificationStore';
import { useBreakpoint } from '@/hooks/useWindowSize';

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onDismiss: () => void;
}) {
  const typeColors: Record<string, { bg: string; border: string; icon: string }> = {
    info: { bg: 'rgba(78, 201, 176, 0.08)', border: 'rgba(78, 201, 176, 0.3)', icon: '#4ec9b0' },
    warning: { bg: 'rgba(220, 183, 74, 0.08)', border: 'rgba(220, 183, 74, 0.3)', icon: '#dcb74a' },
    error: { bg: 'rgba(244, 135, 113, 0.08)', border: 'rgba(244, 135, 113, 0.3)', icon: '#f48771' },
    update: { bg: 'rgba(86, 156, 214, 0.08)', border: 'rgba(86, 156, 214, 0.3)', icon: '#569cd6' },
  };
  const colors = typeColors[notification.type] || typeColors.info;
  const timeAgo = getTimeAgo(notification.timestamp);

  const typeIcons: Record<string, string> = {
    info: 'ℹ',
    warning: '⚠',
    error: '✕',
    update: '↑',
  };

  return (
    <div
      style={{
        padding: '10px 12px',
        backgroundColor: notification.read ? 'transparent' : colors.bg,
        borderBottom: '1px solid var(--vscode-border)',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
      onClick={onMarkRead}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--vscode-list-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = notification.read ? 'transparent' : colors.bg;
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span
          style={{
            fontSize: 14,
            color: colors.icon,
            flexShrink: 0,
            marginTop: 1,
            width: 16,
            textAlign: 'center',
          }}
        >
          {typeIcons[notification.type]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--vscode-fg)',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {notification.title}
            </span>
            {!notification.read && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#569cd6',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
          <p
            style={{
              fontSize: 11,
              color: 'var(--vscode-fg)',
              opacity: 0.7,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {notification.message}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'var(--vscode-fg)', opacity: 0.4 }}>
              {timeAgo}
            </span>
            {notification.actions?.map((action, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  action.action();
                }}
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  backgroundColor: 'var(--vscode-button-bg)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontWeight: 500,
                  minHeight: 24,
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--vscode-fg)',
            opacity: 0.3,
            cursor: 'pointer',
            padding: 2,
            flexShrink: 0,
            fontSize: 14,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.3';
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationCenter() {
  const {
    notifications,
    showCenter,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    toggleCenter,
    setShowCenter,
  } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const { isMobile, width: vw } = useBreakpoint();

  useEffect(() => {
    if (!showCenter) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowCenter(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCenter, setShowCenter]);

  if (!showCenter) return null;

  // Responsive: full-width on small mobile, otherwise capped
  const panelWidth = isMobile ? Math.min(vw - 16, 380) : 380;
  const panelMaxHeight = isMobile ? Math.floor(window.innerHeight * 0.6) : 500;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom: isMobile ? 60 : 24,
        right: isMobile ? 8 : 8,
        width: panelWidth,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: panelMaxHeight,
        backgroundColor: 'var(--vscode-dropdown-bg)',
        border: '1px solid var(--vscode-border)',
        borderRadius: 6,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 20000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--vscode-border)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--vscode-fg)' }}>
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                fontSize: 10,
                padding: '2px 8px',
                background: 'transparent',
                border: '1px solid var(--vscode-border)',
                borderRadius: 3,
                color: 'var(--vscode-fg)',
                cursor: 'pointer',
                opacity: 0.7,
                minHeight: 24,
              }}
            >
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              style={{
                fontSize: 10,
                padding: '2px 8px',
                background: 'transparent',
                border: '1px solid var(--vscode-border)',
                borderRadius: 3,
                color: 'var(--vscode-fg)',
                cursor: 'pointer',
                opacity: 0.7,
                minHeight: 24,
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: panelMaxHeight - 40, WebkitOverflowScrolling: 'touch' }}>
        {notifications.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 16px',
              color: 'var(--vscode-fg)',
              opacity: 0.4,
              fontSize: 12,
            }}
          >
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={() => markAsRead(notification.id)}
              onDismiss={() => clearNotification(notification.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
