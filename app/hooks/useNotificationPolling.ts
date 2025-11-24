import type {
  NotificationResponse,
  NotificationSourceType,
  UseNotificationPollingOptions,
} from '@/components/notification/types';
import { ROUTE_PATH as NOTIFICATIONS_INDEX_ACTION } from '@/routes/api/notifications';
import { differenceInMinutes } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFetcher } from 'react-router';

/**
 * User context for tracking notification state
 */
interface NotificationUserContext {
  hasUnreadNotifications: boolean;
}

/**
 * Custom hook for notification polling with configurable intervals and smart refresh triggers
 *
 * Features:
 * - Simple polling: Fixed interval (default 5 minutes, configurable via NotificationProvider)
 * - Intelligent refresh: Triggers on user interaction, page visibility, and dropdown opens
 * - Activity tracking: Respects user activity patterns for optimal timing
 * - Date handling: Uses date-fns for robust date-time calculations
 * - Route stability: Persistent fetcher prevents unnecessary requests during navigation
 * - Debounced refresh: Prevents spam requests with minimum time intervals
 *
 * Polling Strategy:
 * - Background polling: 5 minutes by default (configurable)
 * - Smart refresh: Additional refreshes on user interaction, dropdown opens, page visibility changes
 * - Debouncing: 2-minute minimum between manual refreshes, 5-minute between visibility refreshes
 *
 * Usage:
 * - Configure interval in root NotificationProvider
 * - Smart refresh: On dropdown open, page visibility change, user activity
 * - Configurable: Set custom intervals via NotificationProvider options
 */
export function useNotificationPolling(options: UseNotificationPollingOptions = {}) {
  const { interval, enabled = true, sources, onUpdate } = options;

  const fetcher = useFetcher<NotificationResponse>({
    key: 'global-notifications', // Prevents recreation on route changes
  });
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const lastPollTime = useRef<Date>(new Date());
  const userActivityTime = useRef<Date>(new Date());

  // User context tracking for notification state
  const [userContext, setUserContext] = useState<NotificationUserContext>({
    hasUnreadNotifications: false,
  });

  // Store current config in refs to avoid stale closures
  const configRef = useRef({ enabled, interval: 0, apiUrl: '' });
  const isInitialMount = useRef(true);

  /**
   * Calculate polling interval - simply use the provided interval or default to 5 minutes
   */
  const getSmartInterval = useCallback(
    (): number => {
      // Simple fixed interval polling
      return interval || 5 * 60 * 1000; // 5 minutes default
    },
    [interval]
  );

  // Build API URL with source filter
  const apiUrl = useMemo(() => {
    return sources
      ? `${NOTIFICATIONS_INDEX_ACTION}?sources=${sources.join(',')}`
      : NOTIFICATIONS_INDEX_ACTION;
  }, [sources]);

  // Update config ref when values change
  useEffect(() => {
    const smartInterval = getSmartInterval();
    configRef.current = { enabled, interval: smartInterval, apiUrl };
  }, [enabled, interval, apiUrl, getSmartInterval]);

  // Calculate notifications with read state and update user context
  const notifications = useMemo(() => {
    const notificationsList = (fetcher.data?.data?.notifications || []).map((n) => ({
      ...n,
      isRead: readIds.has(n.id),
    }));

    // Update user context when we get new data
    if (fetcher.data?.data?.notifications) {
      const hasUnread = notificationsList.some((n) => !n.isRead);

      setUserContext({
        hasUnreadNotifications: hasUnread,
      });
    }

    return notificationsList;
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
        lastPollTime.current = new Date();
        fetcherRef.current.load(apiUrl);
      }

      // Setup polling interval only if interval > 0
      if (interval > 0) {
        intervalRef.current = setInterval(() => {
          lastPollTime.current = new Date();
          fetcherRef.current.load(configRef.current.apiUrl);
        }, interval);
      }
    },
    [stopPolling]
  );

  /**
   * Smart refresh trigger - only fetch if enough time has passed
   */
  const shouldRefresh = useCallback((minIntervalMinutes: number = 5): boolean => {
    return differenceInMinutes(new Date(), lastPollTime.current) >= minIntervalMinutes;
  }, []);

  // Manual refresh - with smart debouncing
  const refresh = useCallback(
    (force = false) => {
      if (force || shouldRefresh(2)) {
        // 2 minutes minimum between manual refreshes
        fetcherRef.current.load(configRef.current.apiUrl);
      }
    },
    [shouldRefresh]
  );

  /**
   * Smart refresh on user interaction - only refresh if user has been active
   */
  const refreshOnInteraction = useCallback(() => {
    const minutesSinceActivity = differenceInMinutes(new Date(), userActivityTime.current);
    // Only refresh if user was active in the last 10 minutes and enough time passed since last poll
    if (minutesSinceActivity < 10 && shouldRefresh(10)) {
      refresh();
    }
  }, [refresh, shouldRefresh]);

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
  }, [enabled, interval, apiUrl, startPolling]);

  // User activity tracking - for smart refresh triggers
  useEffect(() => {
    const handleUserActivity = () => {
      userActivityTime.current = new Date();
    };

    // Track user activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleUserActivity);
      });
    };
  }, []);

  // Visibility change effect - intelligent refresh with debouncing
  useEffect(() => {
    const handleVisibilityChange = () => {
      const { enabled } = configRef.current;

      if (document.hidden) {
        // Stop polling when tab is hidden
        stopPolling();
      } else if (enabled) {
        // Resume polling when tab becomes visible
        // Only fetch immediately if it's been more than 5 minutes
        const shouldFetchImmediately = shouldRefresh(5);
        startPolling(shouldFetchImmediately);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // Only depend on stable callbacks
  }, [stopPolling, startPolling, shouldRefresh]);

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
    refreshOnInteraction,
    error: fetcher.data?.success === false ? fetcher.data.error : null,
  };
}
