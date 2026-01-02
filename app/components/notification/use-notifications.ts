// app/components/notification/use-notifications.ts
import type {
  NotificationResponse,
  NotificationSourceType,
  UseNotificationPollingOptions,
} from './types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

const NOTIFICATIONS_API_PATH = '/api/notifications' as const;

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (sources?: NotificationSourceType[]) =>
    sources ? [...notificationKeys.all, { sources }] : notificationKeys.all,
};

async function fetchNotifications(
  sources?: NotificationSourceType[]
): Promise<NotificationResponse> {
  const url = sources
    ? `${NOTIFICATIONS_API_PATH}?sources=${sources.join(',')}`
    : NOTIFICATIONS_API_PATH;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return response.json();
}

/**
 * React Query-based notification hook with polling support.
 *
 * Features:
 * - Polling: Configurable interval (default 5 minutes)
 * - Tab focus: Refetches when tab becomes visible
 * - Manual refresh: Exposed refetch function
 * - Read state: Local state tracking for read notifications
 */
export function useNotifications(options: UseNotificationPollingOptions = {}) {
  const { interval = 5 * 60 * 1000, enabled = true, sources, onUpdate } = options;
  const queryClient = useQueryClient();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: notificationKeys.list(sources),
    queryFn: () => fetchNotifications(sources),
    enabled,
    refetchInterval: interval,
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000, // Consider data stale after 1 minute
  });

  // Calculate notifications with read state
  const notifications = useMemo(() => {
    const notificationsList = (data?.data?.notifications || []).map((n) => ({
      ...n,
      isRead: readIds.has(n.id),
    }));

    return notificationsList;
  }, [data, readIds]);

  // Calculate counts
  const counts = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead).length;
    const bySource: Record<NotificationSourceType, number> = {
      invitation: notifications.filter((n) => n.source === 'invitation' && !n.isRead).length,
    };

    // Call onUpdate when counts change
    if (onUpdate) {
      onUpdate(bySource);
    }

    return {
      total: notifications.length,
      unread,
      bySource,
    };
  }, [notifications, onUpdate]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }, [notifications]);

  // Manual refresh
  const refresh = useCallback(
    (force = false) => {
      if (force) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }
      refetch();
    },
    [queryClient, refetch]
  );

  // Smart refresh on interaction
  const refreshOnInteraction = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    notifications,
    counts,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
    refreshOnInteraction,
    error: error instanceof Error ? error.message : data?.success === false ? data.error : null,
  };
}
