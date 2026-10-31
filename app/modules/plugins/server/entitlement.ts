/**
 * Server-side entitlement gate for the plugin mount, SERVER-ONLY.
 *
 * A plugin whose spec says `visibility.entitlement: Required` mounts in a
 * project only when that project holds an Active ServiceEntitlement for the
 * plugin's service. The lookup is the same one the client sidebar runs
 * (`use-active-service-entitlements`): list the project's
 * `services.miloapis.com/v1alpha1` ServiceEntitlements and match
 * `status.serviceName` or `spec.serviceRef.name`. Here it runs with the
 * caller's session token, which the control-plane client reads from the
 * request context.
 *
 * The decision fails closed: a lookup error refuses the mount, never falls
 * back to it.
 */
import {
  EXTENSION_NAV_PROJECT,
  type NavProjectExtension,
  type PluginRegistryEntry,
} from '../types';
import { getRequestContext } from '@/modules/axios/request-context';
import {
  entitlementServiceIds,
  type EntitlementLike,
} from '@/modules/entitlements/entitled-services';
import { logger } from '@/modules/logger';
import { createServiceEntitlementService } from '@/resources/service-entitlements';
import { AppError, NotFoundError } from '@/utils/errors/app-error';

/** How long a project's Active entitlement ids are reused before a fresh lookup. */
export const ENTITLEMENT_CACHE_TTL_MS = 60_000;

/** Upper bound on cached (user, project) pairs; the oldest entry is evicted first. */
const MAX_CACHE_ENTRIES = 5_000;

export type ListEntitlements = (projectId: string) => Promise<EntitlementLike[]>;

export interface EntitlementCheckerOptions {
  /** Lists a project's ServiceEntitlements with the caller's credentials. */
  list?: ListEntitlements;
  /** Who is asking. Entries are keyed per caller; no caller means no caching. */
  callerId?: () => string | undefined;
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}

export interface EntitlementChecker {
  /** True when the plugin needs no entitlement or the project holds a matching Active one. */
  isEntitled(projectId: string, entry: PluginRegistryEntry): Promise<boolean>;
}

interface CacheEntry {
  ids: ReadonlySet<string>;
  expiresAt: number;
}

/**
 * Service ids an Active entitlement may name to unlock this plugin, in order
 * of preference: the catalog's canonical `serviceName`, the Service object
 * name, the plugin slug (the client's default `serviceRef`), then any
 * `serviceRef` the manifest's nav items declare. Matching only the slug would
 * refuse an entitled project whose plugin slug (`compute`) differs from the
 * canonical id (`compute.miloapis.com`) and whose manifest omits `serviceRef`.
 */
export function pluginEntitlementIds(entry: PluginRegistryEntry): string[] {
  // `PluginExtension` includes an open-ended unknown variant, so `type` does not
  // narrow `properties`; read the nav `serviceRef` defensively.
  const navRefs = (entry.manifest?.extensions ?? []).flatMap((ext): unknown[] =>
    ext.type === EXTENSION_NAV_PROJECT ? [(ext as NavProjectExtension).properties?.serviceRef] : []
  );
  const candidates: unknown[] = [
    entry.spec.serviceName,
    entry.spec.serviceRefName,
    entry.spec.slug,
    ...navRefs,
  ];
  const ids = candidates
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id.length > 0);
  return [...new Set(ids)];
}

function activeIdsOf(items: EntitlementLike[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.status?.phase !== 'Active') continue;
    for (const id of entitlementServiceIds(item)) ids.add(id);
  }
  return ids;
}

/**
 * Turn a failed lookup into the error the loader throws. Upstream 4xx answers
 * (401, 403, 404) are already the right response and pass through. Anything
 * else becomes a 503 so the page says "try again" instead of "not found".
 */
function lookupFailure(error: unknown): AppError {
  if (error instanceof AppError && error.status < 500) return error;
  const alreadyReported = error instanceof AppError ? error.sentryEventId : undefined;
  return new AppError('Could not confirm this project has access to the service', {
    code: 'ENTITLEMENT_LOOKUP_FAILED',
    status: 503,
    cause: error,
    captureToSentry: alreadyReported === undefined,
    sentryEventId: alreadyReported,
  });
}

export function createEntitlementChecker(
  options: EntitlementCheckerOptions = {}
): EntitlementChecker {
  const list: ListEntitlements =
    options.list ?? ((projectId) => createServiceEntitlementService().list(projectId));
  const callerId = options.callerId ?? (() => getRequestContext()?.userId || undefined);
  const ttlMs = options.ttlMs ?? ENTITLEMENT_CACHE_TTL_MS;
  const maxEntries = options.maxEntries ?? MAX_CACHE_ENTRIES;
  const now = options.now ?? Date.now;

  // Keyed by caller AND project: the list is read with the caller's
  // credentials, so one user's answer must never satisfy another user's request.
  const cache = new Map<string, CacheEntry>();

  function remember(key: string, ids: ReadonlySet<string>): void {
    cache.delete(key);
    if (cache.size >= maxEntries) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { ids, expiresAt: now() + ttlMs });
  }

  async function activeIds(projectId: string): Promise<ReadonlySet<string>> {
    const caller = callerId();
    const key = caller ? JSON.stringify([caller, projectId]) : undefined;
    const hit = key ? cache.get(key) : undefined;
    if (hit && hit.expiresAt > now()) return hit.ids;

    const ids = activeIdsOf(await list(projectId));
    if (key) remember(key, ids);
    return ids;
  }

  return {
    async isEntitled(projectId, entry) {
      if (entry.spec.visibility.entitlement !== 'Required') return true;

      let active: ReadonlySet<string>;
      try {
        active = await activeIds(projectId);
      } catch (error) {
        logger.error('[plugins] service entitlement lookup failed; refusing to mount', {
          projectId,
          slug: entry.spec.slug,
          error: error instanceof Error ? error.message : String(error),
        });
        throw lookupFailure(error);
      }

      return pluginEntitlementIds(entry).some((id) => active.has(id));
    },
  };
}

/** Process-wide checker used by the mount loader. */
export const pluginEntitlements: EntitlementChecker = createEntitlementChecker();

/**
 * The mount loader's entitlement gate. Throws `NotFoundError` when the project
 * is not entitled, the same 404 an unknown slug gets, so the response does not
 * reveal that the plugin exists. Lookup failures propagate from the checker.
 * Dev-sourced plugins skip the gate: the remote catalog has no
 * ServiceEntitlement for a service that does not exist there yet.
 */
export async function assertPluginEntitled(
  projectId: string,
  entry: PluginRegistryEntry,
  checker: EntitlementChecker = pluginEntitlements
): Promise<void> {
  if (entry.devMode) return;
  if (await checker.isEntitled(projectId, entry)) return;
  throw new NotFoundError('Service', entry.spec.slug);
}
