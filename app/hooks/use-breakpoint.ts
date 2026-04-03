import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < TABLET_MIN) return 'mobile';
  if (width < DESKTOP_MIN) return 'tablet';
  return 'desktop';
}

/**
 * Returns current breakpoint tier: 'mobile' | 'tablet' | 'desktop'.
 *
 * SSR default: 'desktop' (matches SidebarProvider's defaultOpen=true pattern
 * to avoid hydration mismatch). Client corrects on mount via useEffect.
 *
 * Breakpoints: mobile <768px, tablet 768–1023px, desktop ≥1024px
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const update = () => setBreakpoint(getBreakpoint());
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
