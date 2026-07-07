/**
 * Shared regression test resources — Node-side (runs in setupNodeEvents).
 *
 * Problem: Each regression spec creates its own org + project, leading to
 * resource sprawl and unreliable cleanup when tests fail mid-run.
 *
 * Solution:
 * - Lazily create one org + project per Cypress process (shard) for shared specs.
 * - Track every org/project created via `createStandardOrg` / `createProjectInOrg`.
 * - Delete all tracked resources in `after:run` (fires even when tests fail).
 *
 * In CI with cypress-split, each shard is its own process — so each shard
 * gets its own org + project with no cross-shard conflicts.
 *
 * Requires `API_URL` and `ACCESS_TOKEN` in the environment (see `.env.example`).
 */

export interface SharedResources {
  orgId: string;
  projectId: string;
  timestamp: number;
}

let cachedResources: SharedResources | null = null;

/** Orgs/projects still present in the target environment after the run. */
const trackedOrgs = new Set<string>();
const trackedProjects = new Map<string, string>();

function getApiCredentials(): { apiUrl: string; accessToken: string } | null {
  const apiUrl = process.env.API_URL;
  const accessToken = process.env.ACCESS_TOKEN;

  if (!apiUrl || !accessToken) {
    console.warn('[shared-resources] Cannot cleanup: API_URL or ACCESS_TOKEN not set');
    return null;
  }

  return { apiUrl, accessToken };
}

async function deleteViaApi(url: string, label: string): Promise<boolean> {
  const credentials = getApiCredentials();
  if (!credentials) return false;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok || response.status === 404) {
      console.log(`[shared-resources] ${label} deleted (${response.status})`);
      return true;
    }

    const body = await response.text().catch(() => '');
    console.warn(`[shared-resources] Failed to delete ${label}: ${response.status} ${body}`);
    return false;
  } catch (error) {
    console.warn(`[shared-resources] Error deleting ${label}:`, error);
    return false;
  }
}

/**
 * Delete an org via the control-plane API (Node-side, no browser needed).
 */
async function deleteOrgViaApi(orgId: string): Promise<void> {
  if (!orgId) return;

  const credentials = getApiCredentials();
  if (!credentials) return;

  const url = `${credentials.apiUrl}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgId}`;
  console.log(`[shared-resources] Deleting org via API: ${orgId}`);
  const deleted = await deleteViaApi(url, `org ${orgId}`);
  if (deleted) {
    releaseTestOrg(orgId);
  }
}

/**
 * Delete a project via the control-plane API. Org delete cascades to projects,
 * but explicit project cleanup avoids leaving orphans when the org delete fails.
 */
async function deleteProjectViaApi(projectId: string): Promise<void> {
  if (!projectId) return;

  const credentials = getApiCredentials();
  if (!credentials) return;

  const url = `${credentials.apiUrl}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectId}`;
  console.log(`[shared-resources] Deleting project via API: ${projectId}`);
  const deleted = await deleteViaApi(url, `project ${projectId}`);
  if (deleted) {
    releaseTestProject(projectId);
  }
}

export function registerTestOrg(orgId: string): void {
  if (!orgId) return;
  trackedOrgs.add(orgId);
}

export function registerTestProject(projectId: string, orgId: string): void {
  if (!projectId) return;
  trackedProjects.set(projectId, orgId);
}

export function releaseTestOrg(orgId: string): void {
  if (!orgId) return;
  trackedOrgs.delete(orgId);
}

export function releaseTestProject(projectId: string): void {
  if (!projectId) return;
  trackedProjects.delete(projectId);
}

/**
 * Delete all tracked projects, then orgs. Idempotent — 404s are treated as success.
 */
async function cleanupAllTestResources(): Promise<void> {
  const projectIds = [...trackedProjects.keys()];
  for (const projectId of projectIds) {
    await deleteProjectViaApi(projectId);
  }

  const orgIds = [...trackedOrgs];
  for (const orgId of orgIds) {
    await deleteOrgViaApi(orgId);
  }

  clearSharedResources();
}

/**
 * Returns the cached shared resources (or null if not yet created).
 */
export function getSharedResources(): SharedResources | null {
  return cachedResources;
}

/**
 * Stores shared resources after browser-side creation.
 */
export function setSharedResources(resources: SharedResources): SharedResources {
  cachedResources = resources;
  registerTestOrg(resources.orgId);
  registerTestProject(resources.projectId, resources.orgId);
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
    registerTestOrg(orgId: string): null {
      registerTestOrg(orgId);
      return null;
    },
    registerTestProject(payload: { projectId: string; orgId: string }): null {
      registerTestProject(payload.projectId, payload.orgId);
      return null;
    },
    releaseTestOrg(orgId: string): null {
      releaseTestOrg(orgId);
      return null;
    },
    releaseTestProject(projectId: string): null {
      releaseTestProject(projectId);
      return null;
    },
    deleteOrgViaApi(orgId: string): Promise<null> {
      return deleteOrgViaApi(orgId).then(() => null);
    },
    deleteProjectViaApi(projectId: string): Promise<null> {
      return deleteProjectViaApi(projectId).then(() => null);
    },
    cleanupAllTestResources(): Promise<null> {
      return cleanupAllTestResources().then(() => null);
    },
  });

  // Cleanup after ALL specs in this shard complete — fires in Node even if tests crash.
  on('after:run', async () => {
    await cleanupAllTestResources();
  });
}
