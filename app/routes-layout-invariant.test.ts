import routeConfig from './routes';
import { paths } from '@/utils/config/paths.config';
import { describe, expect, it } from 'bun:test';

/**
 * The blocking-page invariant, asserted once so three defensive guards
 * elsewhere don't each have to be trusted on their own.
 *
 * Every page the redirect cascade can send a user TO must sit outside the
 * private layout. Inside it, the layout would run the middleware that issued
 * the redirect and bounce the user to the same page forever. The guards in
 * resolveUserFraudRedirectPath, authMiddleware's skip list, and
 * fraudStatusMiddleware are written to survive a break here — but nothing
 * except this test tells you the break happened.
 */

type RouteEntry = { file?: string; path?: string; children?: RouteEntry[] };

const BLOCKING_PAGES = [
  paths.fraud.verifying,
  paths.fraud.accountUnderReview,
  paths.fraud.accountSuspended,
  paths.fraud.verifyEmail,
];

/** `route('verify-email', ...)` declares path 'verify-email'; paths.config uses '/verify-email'. */
const toRouteSegment = (path: string): string => path.replace(/^\//, '');

const topLevelPaths = new Set(
  (routeConfig as RouteEntry[]).map((entry) => entry.path).filter((path): path is string => !!path)
);

const collectNested = (entries: RouteEntry[]): string[] =>
  entries.flatMap((entry) => [
    ...(entry.children ?? []).map((child) => child.path).filter((p): p is string => !!p),
    ...collectNested(entry.children ?? []),
  ]);

const nestedPaths = new Set(collectNested(routeConfig as RouteEntry[]));

describe('blocking-page routing invariant', () => {
  it.each(BLOCKING_PAGES)('%s is declared at the top level', (page) => {
    expect(topLevelPaths.has(toRouteSegment(page))).toBe(true);
  });

  it.each(BLOCKING_PAGES)('%s is not nested inside any layout', (page) => {
    expect(nestedPaths.has(toRouteSegment(page))).toBe(false);
  });

  it('has a route for every page the cascade can redirect to', () => {
    // Guards the reverse direction: adding a fifth destination to
    // resolveUserFraudRedirectPath without a route here would 404 the user
    // into a dead end rather than blocking them.
    expect(BLOCKING_PAGES.every((page) => topLevelPaths.has(toRouteSegment(page)))).toBe(true);
  });
});
