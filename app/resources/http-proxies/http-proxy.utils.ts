import type { HttpProxy } from './http-proxy.schema';
import {
  formatWafProtectionStateLabel,
  formatWafProtectionStatusTooltip,
  getWafProtectionState,
  type WafProtectionState,
} from './http-proxy.waf-status';

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

/**
 * Format Protection for the detail card: readiness state for the in-pill icon,
 * plus the mode · paranoia config label.
 */
export function formatWafProtectionStatusDisplay(
  httpProxy: HttpProxy,
  programmed?: boolean,
  programmedReason?: string,
  programmedMessage?: string
): {
  state: WafProtectionState;
  statusLabel: string;
  configLabel: string;
  statusTooltip?: string;
} {
  const mode = httpProxy.trafficProtectionMode || 'Disabled';
  const state = getWafProtectionState(mode, programmed === true, programmedReason);
  const configLabel = formatWafProtectionDisplay(httpProxy);
  return {
    state,
    statusLabel: formatWafProtectionStateLabel(state),
    configLabel,
    statusTooltip: formatWafProtectionStatusTooltip(state, programmedMessage),
  };
}
