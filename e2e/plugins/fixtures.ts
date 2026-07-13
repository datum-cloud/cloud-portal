/**
 * Test fixtures shared by the plugin e2e specs.
 *
 * Exposes the runtime state discovered in global-setup (project id, tier
 * availability, plugin identity) plus small helpers for building plugin URLs
 * and reading the public registry endpoint.
 */
import type { PublicPlugin } from '../../app/modules/plugins/types';
import { PLUGINS_API_PATH } from './lib/config';
import { readRuntimeState, type RuntimeState } from './lib/runtime-state';
import { test as base, expect, type APIRequestContext } from '@playwright/test';

// Playwright requires worker-scoped fixtures in the SECOND generic slot.
interface WorkerFixtures {
  /** Runtime state discovered once per worker in global-setup. */
  state: RuntimeState;
}

interface TestFixtures {
  /** `/project/<projectId>/home` — a real project page that renders the sidebar. */
  projectHomeUrl: string;
  /** Build a plugin page URL: `/project/<id>/services/<slug>/<path>`. */
  pluginPageUrl: (slug: string, path: string) => string;
}

// Playwright's fixture-resolver callback is conventionally named `use`, but
// that name trips eslint-plugin-react-hooks (it assumes any `use(...)` call is
// React's hook) — renamed to `resolve` here, which is functionally identical.
export const test = base.extend<TestFixtures, WorkerFixtures>({
  state: [
    async ({}, resolve) => {
      await resolve(readRuntimeState());
    },
    { scope: 'worker' },
  ],
  projectHomeUrl: async ({ state }, resolve) => {
    await resolve(`/project/${state.projectId}/home`);
  },
  pluginPageUrl: async ({ state }, resolve) => {
    await resolve((slug, path) => `/project/${state.projectId}/services/${slug}/${path}`);
  },
});

export { expect };

/** GET /api/plugins and return the parsed public registry projection. */
export async function fetchPlugins(request: APIRequestContext): Promise<PublicPlugin[]> {
  const res = await request.get(PLUGINS_API_PATH);
  expect(res.ok(), `GET ${PLUGINS_API_PATH} → ${res.status()}`).toBeTruthy();
  const body = await res.json();
  // Tolerate either a bare array or a { plugins: [...] } envelope.
  return Array.isArray(body) ? body : (body.plugins ?? body.items ?? []);
}

/** Count extensions by type from a public plugin's manifest. */
export function extensionCounts(plugin: PublicPlugin): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ext of plugin.manifest?.extensions ?? []) {
    counts[ext.type] = (counts[ext.type] ?? 0) + 1;
  }
  return counts;
}
