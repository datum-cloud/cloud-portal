import type {
  NotificationResponse,
  NotificationSourceType,
  UseNotificationPollingOptions,
} from './types';
import { ROUTE_PATH as NOTIFICATIONS_INDEX_ACTION } from '@/routes/api/notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFetcher } from 'react-router';

/**
 * Custom hook for polling notification data with client-side read state management
 */
export function useNotificationPolling(options: UseNotificationPollingOptions = {}) {
  const { interval = 60000, enabled = true, sources, onUpdate } = options;

  const fetcher = useFetcher<NotificationResponse>();
  const intervalRef = useRef<NodeJS.Timeout>(undefined);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Build API URL with source filter
  const apiUrl = useMemo(() => {
    return sources
      ? `${NOTIFICATIONS_INDEX_ACTION}?sources=${sources.join(',')}`
      : NOTIFICATIONS_INDEX_ACTION;
  }, [sources]);

  // Calculate notifications with read state
  const notifications = useMemo(() => {
    return (fetcher.data?.data?.notifications || []).map((n) => ({
      ...n,
      isRead: readIds.has(n.id),
    }));
  }, [fetcher.data, readIds]);

  // Calculate counts
  const counts = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead).length;
    const bySource: Record<NotificationSourceType, number> = {
      invitation: notifications.filter((n) => n.source === 'invitation' && !n.isRead).length,
    };

    return {
      total: notifications.length,
      unread,
      bySource,
    };
  }, [notifications]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }, [notifications]);

  // Manual refresh - removed fetcher from dependencies to prevent infinite loop
  const refresh = useCallback(() => {
    fetcher.load(apiUrl);
  }, [apiUrl]);

  // Auto-polling
  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetcher.load(apiUrl);

    // Setup interval
    intervalRef.current = setInterval(() => {
      fetcher.load(apiUrl);
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, apiUrl]);

  // Pause polling when tab hidden (performance optimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      } else if (enabled) {
        fetcher.load(apiUrl);
        intervalRef.current = setInterval(() => {
          fetcher.load(apiUrl);
        }, interval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, interval, apiUrl]);

  // Notify on count changes
  useEffect(() => {
    if (onUpdate) {
      onUpdate(counts.bySource);
    }
  }, [counts.bySource, onUpdate]);

  return {
    notifications,
    counts,
    isLoading: fetcher.state === 'loading',
    markAsRead,
    markAllAsRead,
    refresh,
    error: fetcher.data?.success === false ? fetcher.data.error : null,
  };
}
