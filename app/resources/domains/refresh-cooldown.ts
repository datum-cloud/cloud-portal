import { useEffect, useState } from 'react';

/** The API rejects a registration refresh within 5 minutes of the previous one. */
export const REFRESH_COOLDOWN_SECONDS = 5 * 60;

export const getRefreshCooldownRemaining = (
  lastRefreshAttempt?: string,
  now: number = Date.now()
): number => {
  if (!lastRefreshAttempt) return 0;

  const lastAttemptTime = new Date(lastRefreshAttempt).getTime();
  if (isNaN(lastAttemptTime)) return 0;

  const elapsedSeconds = Math.floor((now - lastAttemptTime) / 1000);
  const remaining = REFRESH_COOLDOWN_SECONDS - elapsedSeconds;

  return Math.min(Math.max(remaining, 0), REFRESH_COOLDOWN_SECONDS);
};

export const formatRefreshCooldown = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const getRefreshCooldownMessage = (seconds: number): string => {
  const [value, unit] = seconds < 60 ? [seconds, 'second'] : [Math.ceil(seconds / 60), 'minute'];
  const wait = `${value} ${unit}${value === 1 ? '' : 's'}`;
  return `Domains can be refreshed once every 5 minutes. Try again in ${wait}.`;
};

/**
 * Seconds left before a domain registration can be refreshed again.
 * Ticks every second while the cooldown is active so callers re-enable on time.
 */
export function useRefreshCooldown(lastRefreshAttempt?: string) {
  const [now, setNow] = useState(() => Date.now());
  const remainingSeconds = getRefreshCooldownRemaining(lastRefreshAttempt, now);
  const isOnCooldown = remainingSeconds > 0;

  useEffect(() => {
    if (!isOnCooldown) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOnCooldown]);

  return { remainingSeconds, isOnCooldown };
}
