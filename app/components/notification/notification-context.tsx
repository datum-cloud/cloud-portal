import type { UseNotificationPollingOptions } from '@/components/notification/types';
import { useNotificationPolling } from '@/hooks/useNotificationPolling';
import { createContext, useContext, ReactNode } from 'react';

/**
 * Context for global notification state that persists across layout changes
 */
interface NotificationContextType {
  notifications: ReturnType<typeof useNotificationPolling>['notifications'];
  counts: ReturnType<typeof useNotificationPolling>['counts'];
  isLoading: ReturnType<typeof useNotificationPolling>['isLoading'];
  markAsRead: ReturnType<typeof useNotificationPolling>['markAsRead'];
  markAllAsRead: ReturnType<typeof useNotificationPolling>['markAllAsRead'];
  refresh: ReturnType<typeof useNotificationPolling>['refresh'];
  refreshOnInteraction: ReturnType<typeof useNotificationPolling>['refreshOnInteraction'];
  error: ReturnType<typeof useNotificationPolling>['error'];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Provider component that persists notification state across layout changes
 * This prevents the notification system from remounting and making new requests
 */
export function NotificationProvider({
  children,
  options = {},
}: {
  children: ReactNode;
  options?: UseNotificationPollingOptions;
}) {
  const notificationState = useNotificationPolling({
    enabled: true,
    ...options,
  });

  return (
    <NotificationContext.Provider value={notificationState}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Update notification options (useful for dynamic polling intervals)
 * Note: This would require a more complex implementation if we need to change options after mount
 */
export function useUpdateNotificationOptions() {
  // This could be implemented in the future if we need dynamic option updates
  // For now, the NotificationProvider sets the options once at mount
  console.warn(
    'useUpdateNotificationOptions is not implemented yet. Configure options in NotificationProvider.'
  );
  return () => {};
}

/**
 * Hook to access notification state from anywhere in the app
 * This ensures the same polling instance is used across all layouts
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
