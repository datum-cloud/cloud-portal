import { getHints, viewportHint } from './client-hints';
import { DESKTOP_MIN, TABLET_MIN, breakpointForWidth } from '@/hooks/use-breakpoint';
import { describe, expect, it } from 'bun:test';

/** Runs the hint's inline snippet the way the check script does, against a fake window. */
function evaluateViewportCode(innerWidth: number): string {
  // Mirrors `String(${getValueCode})` in the generated check script.
  return new Function('window', `return String(${viewportHint.getValueCode});`)({ innerWidth });
}

function requestWithCookie(cookie?: string): Request {
  return new Request('https://cloud.example.com/', {
    headers: cookie ? { Cookie: cookie } : {},
  });
}

describe('viewportHint', () => {
  it('stores a breakpoint tier, not a raw width, so resizing inside a tier never reloads', () => {
    expect(evaluateViewportCode(375)).toBe('mobile');
    expect(evaluateViewportCode(800)).toBe('tablet');
    expect(evaluateViewportCode(1023)).toBe('tablet');
    expect(evaluateViewportCode(1024)).toBe('desktop');
    expect(evaluateViewportCode(1920)).toBe('desktop');
  });

  // The snippet is a string (it runs inline before any bundle), so it cannot
  // call breakpointForWidth. Pin the two to the same answer at every edge.
  it('agrees with breakpointForWidth on both sides of each breakpoint', () => {
    for (const width of [0, TABLET_MIN - 1, TABLET_MIN, DESKTOP_MIN - 1, DESKTOP_MIN, 4000]) {
      expect(evaluateViewportCode(width)).toBe(breakpointForWidth(width));
    }
  });

  it('falls back to desktop, matching what the server rendered before the hint existed', () => {
    expect(viewportHint.fallback).toBe('desktop');
  });
});

describe('getHints viewport', () => {
  it('reads the tier from the hint cookie', () => {
    expect(getHints(requestWithCookie('CH-viewport=tablet')).viewport).toBe('tablet');
    expect(getHints(requestWithCookie('theme=dark; CH-viewport=mobile')).viewport).toBe('mobile');
  });

  it('falls back to desktop when the cookie is missing', () => {
    expect(getHints(requestWithCookie()).viewport).toBe('desktop');
  });

  it('falls back to desktop when the cookie holds an unknown value', () => {
    expect(getHints(requestWithCookie('CH-viewport=1280')).viewport).toBe('desktop');
  });
});
