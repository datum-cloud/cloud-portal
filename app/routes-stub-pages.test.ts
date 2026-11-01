import routes from './routes';
import { paths } from '@/utils/config/paths.config';
import { describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Settings pages with no backend behind them (fake access tokens, notification
 * toggles that only logged to the console) were removed rather than left
 * reachable by URL. These guards keep them from coming back unnoticed.
 */

interface RouteEntry {
  path?: string;
  file: string;
  children?: RouteEntry[];
}

const walk = (entries: RouteEntry[], parent = ''): { path: string; file: string }[] =>
  entries.flatMap((entry) => {
    const path = [parent, entry.path].filter(Boolean).join('/');
    return [{ path, file: entry.file }, ...walk(entry.children ?? [], path)];
  });

const table = walk(routes as RouteEntry[]);

const REMOVED_PATHS = [
  'account/access-tokens',
  'org/:orgId/notifications',
  'org/:orgId/policy-bindings',
  'project/:projectId/notifications',
  'project/:projectId/dns-zones/:dnsZoneId/overview',
];

describe('stub settings pages', () => {
  it('are not registered in the route table', () => {
    const registered = table.map((route) => route.path);
    expect(registered.length).toBeGreaterThan(0);
    expect(REMOVED_PATHS.filter((path) => registered.includes(path))).toEqual([]);
  });

  it('leave no path entry behind for links to target', () => {
    const account: Record<string, unknown> = paths.account.settings;
    const orgDetail: Record<string, unknown> = paths.org.detail;
    const orgSettings: Record<string, unknown> = paths.org.detail.settings;
    const projectSettings: Record<string, unknown> = paths.project.detail.settings;

    expect(account.accessTokens).toBeUndefined();
    expect(orgDetail.policyBindings).toBeUndefined();
    expect(orgSettings.notifications).toBeUndefined();
    expect(projectSettings.notifications).toBeUndefined();
  });

  it('every registered route points at a module that exists', () => {
    const missing = table
      .map((route) => route.file)
      .filter((file) => !existsSync(fileURLToPath(new URL(`./${file}`, import.meta.url))));
    expect(missing).toEqual([]);
  });
});
