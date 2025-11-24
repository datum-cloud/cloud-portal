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
 * Fixed: Prevents spam requests on initial load by properly separating polling and visibility concerns
 */
export function useNotificationPolling(options: UseNotificationPollingOptions = {}) {
  const { interval = 15 * 60 * 1000, enabled = true, sources, onUpdate } = options;

  const fetcher = useFetcher<NotificationResponse>();
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Store current config in refs to avoid stale closures in visibility handler
  const configRef = useRef({ enabled, interval, apiUrl: '' });
  const isInitialMount = useRef(true);

  // Build API URL with source filter
  const apiUrl = useMemo(() => {
    return sources
      ? `${NOTIFICATIONS_INDEX_ACTION}?sources=${sources.join(',')}`
      : NOTIFICATIONS_INDEX_ACTION;
  }, [sources]);

  // Update config ref when values change
  useEffect(() => {
    configRef.current = { enabled, interval, apiUrl };
  }, [enabled, interval, apiUrl]);

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

  // Store fetcher.load in ref to avoid dependency issues
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Helper function to stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  // Helper function to start polling
  const startPolling = useCallback(
    (fetchImmediately = true) => {
      const { enabled, interval, apiUrl } = configRef.current;

      if (!enabled) return;

      // Clear any existing interval first
      stopPolling();

      // Fetch immediately if requested (default true)
      if (fetchImmediately) {
        fetcherRef.current.load(apiUrl);
      }

      // Setup polling interval
      intervalRef.current = setInterval(() => {
        fetcherRef.current.load(configRef.current.apiUrl);
      }, interval);
    },
    [stopPolling]
  );

  // Manual refresh
  const refresh = useCallback(() => {
    fetcherRef.current.load(configRef.current.apiUrl);
  }, []);

  // Main polling effect - handles initial fetch and polling setup
  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }

    // Initial fetch on mount (only once)
    const isInitial = isInitialMount.current;
    if (isInitial) {
      isInitialMount.current = false;
    }

    // Start polling (will fetch immediately if initial mount, or when interval/apiUrl changes)
    startPolling(isInitial);

    return () => {
      stopPolling();
    };
    // Only depend on enabled, interval, and apiUrl - not fetcher or stopPolling
  }, [enabled, interval, apiUrl]);

  // Visibility change effect - SEPARATE concern with stable dependencies only
  useEffect(() => {
    const handleVisibilityChange = () => {
      const { enabled } = configRef.current;

      if (document.hidden) {
        // Stop polling when tab is hidden
        stopPolling();
      } else if (enabled) {
        // Resume polling when tab becomes visible - fetch immediately
        startPolling(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // Only depend on stable callbacks
  }, [stopPolling, startPolling]);

  // Notify on count changes - use ref to prevent dependency issues
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (onUpdateRef.current) {
      onUpdateRef.current(counts.bySource);
    }
  }, [counts.bySource]);

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
