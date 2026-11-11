import type { BreakpointTier } from '@datum-cloud/datum-ui/hooks';

/**
 * Viewport tier shared with datum-ui's `useBreakpoint`. The thresholds below
 * must match datum-ui's (mobile <768px, tablet 768–1023px, desktop ≥1024px)
 * so the viewport client hint the server reads agrees with the hook.
 */
export type Breakpoint = BreakpointTier;

export const TABLET_MIN = 768;
export const DESKTOP_MIN = 1024;

const BREAKPOINTS: readonly Breakpoint[] = ['mobile', 'tablet', 'desktop'];

/** Maps a viewport width in CSS pixels to its breakpoint tier. */
export function breakpointForWidth(width: number): Breakpoint {
  if (width < TABLET_MIN) return 'mobile';
  if (width < DESKTOP_MIN) return 'tablet';
  return 'desktop';
}

export function isBreakpoint(value: unknown): value is Breakpoint {
  return typeof value === 'string' && (BREAKPOINTS as readonly string[]).includes(value);
}
