import { SIDEBAR_COOKIE_NAME, getSidebarState, parseSidebarState } from './sidebar.server';
import { describe, expect, test } from 'bun:test';

describe('parseSidebarState', () => {
  test('reads an expanded sidebar as true', () => {
    expect(parseSidebarState(`${SIDEBAR_COOKIE_NAME}=true`)).toBe(true);
  });

  test('reads a collapsed sidebar as false', () => {
    expect(parseSidebarState(`${SIDEBAR_COOKIE_NAME}=false`)).toBe(false);
  });

  test('finds the cookie among unrelated cookies', () => {
    expect(parseSidebarState(`_csrf=abc; ${SIDEBAR_COOKIE_NAME}=false; theme=dark`)).toBe(false);
  });

  test('tolerates the whitespace browsers put after each separator', () => {
    expect(parseSidebarState(`theme=dark;    ${SIDEBAR_COOKIE_NAME}=true`)).toBe(true);
  });

  test('returns undefined when no cookie header is sent', () => {
    expect(parseSidebarState(null)).toBeUndefined();
  });

  test('returns undefined when the sidebar cookie is absent', () => {
    expect(parseSidebarState('_csrf=abc; theme=dark')).toBeUndefined();
  });

  test('returns undefined for a value that is neither "true" nor "false"', () => {
    expect(parseSidebarState(`${SIDEBAR_COOKIE_NAME}=maybe`)).toBeUndefined();
  });

  test('does not match a different cookie whose name ends with the sidebar name', () => {
    expect(parseSidebarState(`x_${SIDEBAR_COOKIE_NAME}=true`)).toBeUndefined();
  });
});

describe('getSidebarState', () => {
  test('reads the state off the request Cookie header', () => {
    const request = new Request('https://portal.datum.net/', {
      headers: { Cookie: `${SIDEBAR_COOKIE_NAME}=false` },
    });

    expect(getSidebarState(request)).toBe(false);
  });

  test('returns undefined when the request carries no cookies', () => {
    expect(getSidebarState(new Request('https://portal.datum.net/'))).toBeUndefined();
  });
});
