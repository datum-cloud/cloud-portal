import type { HttpProxy } from './http-proxy.schema';

/**
 * Get the combined WAF mode + paranoia level display format from mode and blocking level
 */
export function getWafModeWithParanoia(
  mode?: 'Observe' | 'Enforce' | 'Disabled',
  blocking?: number
): 'Observe' | 'Enforce (Basic)' | 'Enforce (Medium)' | 'Enforce (High)' | 'Disabled' {
  if (mode === 'Disabled') return 'Disabled';
  if (mode === 'Observe') return 'Observe';
  if (mode === 'Enforce') {
    if (blocking === 2) return 'Enforce (Medium)';
    if (blocking === 3 || blocking === 4) return 'Enforce (High)';
    return 'Enforce (Basic)'; // Default to Basic (level 1)
  }
  return 'Enforce (Basic)'; // Default
}

/**
 * Parse the combined WAF mode + paranoia level format back to mode and blocking level
 */
export function parseWafModeWithParanoia(
  value: 'Observe' | 'Enforce (Basic)' | 'Enforce (Medium)' | 'Enforce (High)' | 'Disabled'
): { mode: 'Observe' | 'Enforce' | 'Disabled'; blocking?: number } {
  if (value === 'Disabled') return { mode: 'Disabled' };
  if (value === 'Observe') return { mode: 'Observe' };
  if (value === 'Enforce (Basic)') return { mode: 'Enforce', blocking: 1 };
  if (value === 'Enforce (Medium)') return { mode: 'Enforce', blocking: 2 };
  if (value === 'Enforce (High)') return { mode: 'Enforce', blocking: 3 };
  return { mode: 'Enforce', blocking: 1 }; // Default
}

/**
 * Format the WAF protection display text from an HttpProxy
 */
export function formatWafProtectionDisplay(httpProxy: HttpProxy): string {
  const mode = httpProxy.trafficProtectionMode || 'Disabled';
  const blocking = httpProxy.paranoiaLevels?.blocking;
  return getWafModeWithParanoia(mode, blocking);
}
