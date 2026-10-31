import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

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

/**
 * Returns current breakpoint tier: 'mobile' | 'tablet' | 'desktop'.
 *
 * `initial` is what the server rendered with. Pass the viewport client hint the
 * root loader reads (`viewport`) so SSR lays out for the real screen and the
 * hydration render matches it. Without one it defaults to 'desktop'. The client
 * re-measures on mount and tracks resizes after that.
 *
 * Breakpoints: mobile <768px, tablet 768–1023px, desktop ≥1024px
 */
export function useBreakpoint(initial: Breakpoint = 'desktop'): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(initial);

  useEffect(() => {
    const update = () => setBreakpoint(breakpointForWidth(window.innerWidth));
    update();

    const mqTablet = window.matchMedia(`(min-width: ${TABLET_MIN}px)`);
    const mqDesktop = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);

    mqTablet.addEventListener('change', update);
    mqDesktop.addEventListener('change', update);

    return () => {
      mqTablet.removeEventListener('change', update);
      mqDesktop.removeEventListener('change', update);
    };
  }, []);

  return breakpoint;
}
