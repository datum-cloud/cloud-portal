import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'project-dock-width';
export const DOCK_DEFAULT_WIDTH = 512;
const DOCK_MIN_WIDTH = 320;
// Keep at least this much of the page visible beside the dock.
const MIN_CONTENT_WIDTH = 480;
const KEYBOARD_STEP = 32;

function maxWidth() {
  if (typeof window === 'undefined') return DOCK_DEFAULT_WIDTH;
  return Math.max(DOCK_MIN_WIDTH, window.innerWidth - MIN_CONTENT_WIDTH);
}

function clamp(width: number) {
  return Math.round(Math.min(Math.max(width, DOCK_MIN_WIDTH), maxWidth()));
}

function readStoredWidth(): number | null {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  } catch {
    return null;
  }
}

function storeWidth(width: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    // Storage blocked (private window etc.); the width just won't persist.
  }
}

/**
 * Width of the docked panel, resizable by dragging (or arrow-keying) its left
 * edge. Persisted per browser. `resizing` is true mid-drag so the caller can
 * drop its width transition and let the column track the pointer.
 */
export function useDockWidth() {
  const [width, setWidth] = useState(DOCK_DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{ startX: number; startWidth: number; lastWidth: number } | null>(null);

  // Read after mount: localStorage isn't available during SSR.
  useEffect(() => {
    const stored = readStoredWidth();
    if (stored) setWidth(clamp(stored));

    const onResize = () => setWidth((current) => clamp(current));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const commit = useCallback((next: number) => {
    const clamped = clamp(next);
    setWidth(clamped);
    storeWidth(clamped);
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      // Capture so the drag keeps tracking over iframes and off the handle.
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { startX: event.clientX, startWidth: width, lastWidth: width };
      setResizing(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width]
  );

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    // The handle is on the panel's left edge, so dragging left widens it.
    drag.current.lastWidth = clamp(drag.current.startWidth + drag.current.startX - event.clientX);
    setWidth(drag.current.lastWidth);
  }, []);

  const endDrag = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    storeWidth(drag.current.lastWidth);
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'ArrowLeft') commit(width + KEYBOARD_STEP);
      else if (event.key === 'ArrowRight') commit(width - KEYBOARD_STEP);
      else if (event.key === 'Home') commit(DOCK_MIN_WIDTH);
      else if (event.key === 'End') commit(maxWidth());
      else return;
      event.preventDefault();
    },
    [commit, width]
  );

  const reset = useCallback(() => commit(DOCK_DEFAULT_WIDTH), [commit]);

  return {
    width,
    resizing,
    min: DOCK_MIN_WIDTH,
    max: maxWidth(),
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onKeyDown,
      onDoubleClick: reset,
    },
  };
}
