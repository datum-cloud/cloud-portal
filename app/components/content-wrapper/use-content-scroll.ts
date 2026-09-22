import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

/**
 * Scroll positions for the content pane, keyed by history entry. The window
 * never scrolls — `ScrollRestoration` only calls `window.scrollTo` — so back
 * and forward have to be remembered here.
 */
const scrollPositions = new Map<string, number>();

function hashTarget(hash: string): HTMLElement | null {
  if (!hash || hash === '#') return null;
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

/**
 * Scroll the content pane to the top when the pathname changes. Search-param
 * updates keep the current position (`preventScrollReset` on filters). Back
 * and forward restore the position this pane had on that history entry.
 */
export function useContentScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef({ key, pathname, hash });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prev = previous.current;
    if (prev.key !== key) scrollPositions.set(prev.key, el.scrollTop);
    previous.current = { key, pathname, hash };

    if (navigationType === 'POP') {
      const saved = scrollPositions.get(key);
      if (typeof saved === 'number') el.scrollTop = saved;
      return;
    }

    if (prev.pathname === pathname && prev.hash === hash) return;

    const target = hashTarget(hash);
    if (target) {
      target.scrollIntoView();
      return;
    }

    if (prev.pathname !== pathname) el.scrollTop = 0;
  }, [pathname, hash, key, navigationType]);

  return ref;
}
