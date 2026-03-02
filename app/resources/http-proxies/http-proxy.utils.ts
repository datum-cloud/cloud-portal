import type { HttpProxy } from './http-proxy.schema';

/**
 * Get a human-readable label for a paranoia level number.
 */
export function getParanoiaLevelLabel(level?: number): string {
  switch (level) {
    case 1:
      return 'Relaxed';
    case 2:
      return 'Balanced';
    case 3:
      return 'Strict';
    case 4:
      return 'Maximum';
    default:
      return 'Relaxed';
  }
}

/**
 * Format the WAF protection display text from an HttpProxy.
 * Combines mode and paranoia level into a single display string.
 */
export function formatWafProtectionDisplay(httpProxy: HttpProxy): string {
  const mode = httpProxy.trafficProtectionMode || 'Disabled';
  if (mode === 'Disabled') return 'Disabled';
  const blocking = httpProxy.paranoiaLevels?.blocking ?? 1;
  const levelLabel = getParanoiaLevelLabel(blocking);
  return `${mode} · ${levelLabel}`;
}
