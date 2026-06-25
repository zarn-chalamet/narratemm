import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────────
// notification types
// ─────────────────────────────────────────────────────────────────
export type NotificationType =
  | 'export-progress'
  | 'export-done'
  | 'export-failed'
  // Future types
  | 'product-update'
  | 'announcement'
  | 'promotion'
  | 'system';

export interface AppNotification {
  id: string;                          // unique ID (jobId for exports, or generated)
  type: NotificationType;
  title: string;
  message: string;
  link?: string;                       // navigate here on click
  metadata?: Record<string, any>;      // type-specific data (jobId, projectId, progress)
  createdAt: number;
  read: boolean;
  persistent?: boolean;                // don't auto-remove from list
}

// ─────────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────────
interface NotificationState {
  notifications: Record<string, AppNotification>;

  // Generic actions — work for ANY notification type
  addNotification: (notif: Omit<AppNotification, 'createdAt' | 'read'> & { id?: string }) => string;
  updateNotification: (id: string, updates: Partial<AppNotification>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;

  // Helpers
  getUnreadCount: () => number;
  getByType: (type: NotificationType) => AppNotification[];
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: {},

      addNotification: (notif) => {
        const id = notif.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        set((state) => ({
          notifications: {
            ...state.notifications,
            [id]: {
              ...notif,
              id,
              createdAt: Date.now(),
              read: false,
            },
          },
        }));
        return id;
      },

      updateNotification: (id, updates) => {
        set((state) => {
          const existing = state.notifications[id];
          if (!existing) return state;
          return {
            notifications: {
              ...state.notifications,
              [id]: { ...existing, ...updates },
            },
          };
        });
      },

      markAsRead: (id) => {
        set((state) => {
          const existing = state.notifications[id];
          if (!existing) return state;
          return {
            notifications: {
              ...state.notifications,
              [id]: { ...existing, read: true },
            },
          };
        });
      },

      markAllAsRead: () => {
        set((state) => {
          const updated: Record<string, AppNotification> = {};
          Object.entries(state.notifications).forEach(([id, n]) => {
            updated[id] = { ...n, read: true };
          });
          return { notifications: updated };
        });
      },

      removeNotification: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.notifications;
          return { notifications: rest };
        });
      },

      clearAll: () => set({ notifications: {} }),

      getUnreadCount: () =>
        Object.values(get().notifications).filter((n) => !n.read).length,

      getByType: (type) =>
        Object.values(get().notifications).filter((n) => n.type === type),
    }),
    {
      name: 'narratemm-notifications',
    }
  )
);

// ─────────────────────────────────────────────────────────────────
// BROWSER NOTIFICATION HELPER
// ─────────────────────────────────────────────────────────────────
export function showBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/logo.png',
      tag: 'narratemm-notif',
    });
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}