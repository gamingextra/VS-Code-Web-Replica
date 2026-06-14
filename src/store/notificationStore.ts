import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'update';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actions?: { label: string; action: () => void }[];
}

interface NotificationState {
  notifications: Notification[];
  showCenter: boolean;
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  toggleCenter: () => void;
  setShowCenter: (show: boolean) => void;
}

let nextNotifId = 1;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [
    {
      id: 'n-init-1',
      type: 'info',
      title: 'code-server connected',
      message: 'Connected to remote server at 127.0.0.1:8080. Your workspace is ready.',
      timestamp: Date.now() - 60000,
      read: false,
    },
    {
      id: 'n-init-2',
      type: 'update',
      title: 'Update Available',
      message: 'code-server v4.90.0 is available. You are currently running v4.89.0.',
      timestamp: Date.now() - 300000,
      read: false,
      actions: [
        { label: 'Release Notes', action: () => {} },
        { label: 'Dismiss', action: () => {} },
      ],
    },
  ],
  showCenter: false,
  unreadCount: 2,

  addNotification: (notification) => {
    const newNotif: Notification = {
      ...notification,
      id: `n-${nextNotifId++}`,
      timestamp: Date.now(),
      read: false,
    };
    const notifications = [newNotif, ...get().notifications];
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },

  markAsRead: (id) => {
    const notifications = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },

  markAllAsRead: () => {
    const notifications = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications, unreadCount: 0 });
  },

  clearNotification: (id) => {
    const notifications = get().notifications.filter((n) => n.id !== id);
    const unreadCount = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount });
  },

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  toggleCenter: () => set((s) => ({ showCenter: !s.showCenter })),
  setShowCenter: (show) => set({ showCenter: show }),
}));
