/**
 * Shared regression test resources — Node-side (runs in setupNodeEvents).
 *
 * Problem: Each regression spec creates its own org + project, leading to
 * resource sprawl and unreliable cleanup when tests fail mid-run.
 *
 * Solution: Lazily create one org + project per Cypress process (shard).
 * Multiple specs in the same shard share these resources. Cleanup runs
 * via `after:run` which fires even when tests fail.
 *
 * In CI with cypress-split, each shard is its own process — so each shard
 * gets its own org + project with no cross-shard conflicts.
 */

export interface SharedResources {
  orgId: string;
  projectId: string;
  timestamp: number;
}

let cachedResources: SharedResources | null = null;

/**
 * Returns the cached shared resources (or null if not yet created).
 * Creation happens browser-side via cy.task('createSharedResources')
 * because it needs cy.login(), cy.createStandardOrg(), etc.
 */
export function getSharedResources(): SharedResources | null {
  return cachedResources;
}

/**
 * Stores shared resources after browser-side creation.
 */
export function setSharedResources(resources: SharedResources): SharedResources {
  cachedResources = resources;
  return cachedResources;
}

/**
 * Clears cached resources (called after cleanup).
 */
export function clearSharedResources(): null {
  cachedResources = null;
  return null;
}

/**
 * Delete an org via the control-plane API (Node-side, no browser needed).
 * Used by after:run to clean up even when tests crash.
 */
async function deleteOrgViaApi(orgId: string): Promise<void> {
  const apiUrl = process.env.API_URL;
  const accessToken = process.env.ACCESS_TOKEN;

  if (!apiUrl || !accessToken) {
    console.warn('[shared-resources] Cannot cleanup: API_URL or ACCESS_TOKEN not set');
    return;
  }

  const url = `${apiUrl}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgId}`;
  console.log(`[shared-resources] Deleting shared org via API: ${orgId}`);

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok || response.status === 404) {
      console.log(`[shared-resources] Org ${orgId} deleted (${response.status})`);
    } else {
      const body = await response.text().catch(() => '');
      console.warn(`[shared-resources] Failed to delete org ${orgId}: ${response.status} ${body}`);
    }
  } catch (error) {
    console.warn(`[shared-resources] Error deleting org ${orgId}:`, error);
  }
}

/**
 * Register shared resource tasks and cleanup hooks.
 * Call this from setupNodeEvents in cypress.config.ts.
 */
export function registerSharedResourceTasks(on: Cypress.PluginEvents): void {
  on('task', {
    getSharedResources(): SharedResources | null {
      return getSharedResources();
    },
    setSharedResources(resources: SharedResources): SharedResources {
      return setSharedResources(resources);
    },
    clearSharedResources(): null {
      return clearSharedResources();
    },
    deleteOrgViaApi(orgId: string): Promise<null> {
      return deleteOrgViaApi(orgId).then(() => null);
    },
  });

  // Cleanup after ALL specs in this shard complete — fires in Node even if tests crash.
  on('after:run', async () => {
    const resources = getSharedResources();
    if (!resources) return;

    await deleteOrgViaApi(resources.orgId);
    clearSharedResources();
  });
}
