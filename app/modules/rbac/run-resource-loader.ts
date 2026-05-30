import { gateRouteAccess } from './server/check-permission';
import type {
  CompanionDeclaration,
  RunListLoaderInput,
  RunDetailLoaderInput,
  DslLoaderData,
} from './types';
import { logger } from '@/modules/logger';
import { redirectWithToast } from '@/utils/cookies';
import { BadRequestError, PermissionError } from '@/utils/errors';
// NotFoundError is intentionally sourced directly from `app-error` to disambiguate
// from the http-layer `NotFoundError` (one-arg form). We need the (resource, identifier)
// form here so the message reads `<resource> '<id>' not found`. The `@/utils/errors`
// barrel re-exports both under aliased names — see app/utils/errors/index.ts.
import { NotFoundError } from '@/utils/errors/app-error';
import { data, type LoaderFunctionArgs } from 'react-router';

/**
 * Server-only loader runtime for the canonical RBAC route convention.
 *
 * The DSL (`define-resource-route.tsx`) is split across two modules:
 *
 * - `define-resource-route.tsx` (this file's sibling) is CLIENT-SAFE — only
 *   produces `Page`/`meta`/`handle` factories. No server imports.
 * - `run-resource-loader.ts` (this file) is SERVER-ONLY — owns the loader
 *   logic that calls `gateRouteAccess`, redirects, companion fetches, etc.
 *
 * Each migrated route file exports `loader` as a top-level function that
 * delegates here. React Router's Vite plugin strips that `loader` export
 * from the client bundle, which makes the import of `runListLoader` /
 * `runDetailLoader` unused on the client and tree-shakes the entire
 * server-only chain (gateRouteAccess → prom-client) out of the browser
 * bundle.
 */

export async function runListLoader<TData>(
  args: LoaderFunctionArgs,
  cfg: RunListLoaderInput<TData>
) {
  const projectId = args.params.projectId;
  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  // gateRouteAccess takes organizationId as its first positional arg. For
  // project-scoped checks we pass projectId there as a no-op — the actual
  // base URL is resolved from check.projectId in RbacService.resolveBaseURL
  // (app/modules/rbac/server/rbac.service.ts:52-65, the `case 'project':`
  // branch). This pattern matches the existing project convention used in
  // every project-scoped route loader; do not change it without auditing
  // resolveBaseURL.
  const allowed = await gateRouteAccess(projectId, {
    resource: cfg.resource,
    verb: 'list',
    group: cfg.group ?? '',
    namespace: cfg.namespace,
    scope: cfg.scope,
    projectId,
  });

  if (!allowed) {
    return data({ restricted: true } satisfies DslLoaderData<TData, Record<string, never>>);
  }

  const result = await cfg.fetch({ projectId, args });
  return data({
    restricted: false,
    data: result,
    companions: {},
  } satisfies DslLoaderData<TData, Record<string, never>>);
}

export async function runDetailLoader<TData, TCompanions extends Record<string, unknown>>(
  args: LoaderFunctionArgs,
  cfg: RunDetailLoaderInput<TData, TCompanions>
) {
  const projectId = args.params.projectId;
  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }
  const id = args.params[cfg.paramName];
  if (!id) {
    throw new BadRequestError(`${cfg.paramName} is required`);
  }

  // Same project-scoped no-op pattern as runListLoader — see resolveBaseURL note above.
  const allowed = await gateRouteAccess(projectId, {
    resource: cfg.resource,
    verb: 'get',
    group: cfg.group ?? '',
    namespace: cfg.namespace,
    scope: cfg.scope,
    projectId,
  });

  if (!allowed) {
    return data({ restricted: true } satisfies DslLoaderData<TData, TCompanions>);
  }

  const fetched = await cfg.fetch({ projectId, id, args });
  if (!fetched) {
    throw new NotFoundError(cfg.notFoundLabel, id);
  }

  // Redirect-on-deletion runs after the primary fetch (we need the data to
  // inspect deletionTimestamp or similar) but before any companion fetch — no
  // point loading domain data for a record that's vanishing.
  if (cfg.redirectIfDeleting) {
    const descriptor = cfg.redirectIfDeleting({
      data: fetched,
      projectId,
    });
    if (descriptor) {
      return redirectWithToast(descriptor.to, {
        title: descriptor.toast.title,
        description: descriptor.toast.description,
        type: descriptor.toast.type ?? 'message',
      });
    }
  }

  // Companion fetches. Each companion is independently gated and fetched:
  // - Gate denied + `tolerate` → companion = null, no network call made.
  // - Gate denied + `propagate` → throws (programmer-error: a route shouldn't
  //   declare a companion the primary-allowed user cannot access).
  // - Fetch throws + `tolerate` → companion = null, warning logged.
  // - Fetch throws + `propagate` → re-throws (caught by route error boundary).
  //
  // The cast on `cfg.companions` widens each entry's `TCompanionData` generic
  // to `unknown` so we can iterate uniformly. The `companions` Record cast is
  // necessary because TypeScript can't narrow dynamic string-key writes; the
  // final `as TCompanions` is safe by construction (each key maps 1:1 to the
  // declared `TCompanions[K]`).
  const companionEntries = Object.entries(cfg.companions ?? {}) as Array<
    [string, CompanionDeclaration<TData, unknown>]
  >;

  const companions = {} as TCompanions;

  // Companions are fetched sequentially to keep error semantics simple:
  // the gate-denied + propagate branch (PermissionError) and the
  // fetch-throws + propagate branch must short-circuit the loop without
  // observing subsequent companions. If a route ever declares 3+
  // companions and total round-trip latency becomes user-visible, swap to
  // Promise.allSettled with post-processing that respects each declaration's
  // onError mode. Current callers use at most one companion (DNS zone →
  // domain), so sequential is fine for sub-projects #2-5.
  for (const [key, decl] of companionEntries) {
    // Same project-scoped no-op pattern as the primary gate above —
    // see RbacService.resolveBaseURL.
    const companionAllowed = await gateRouteAccess(projectId, {
      resource: decl.resource,
      verb: decl.verb,
      group: decl.group ?? '',
      namespace: decl.namespace,
      scope: decl.scope,
      projectId,
    });

    if (!companionAllowed) {
      if (decl.onError === 'tolerate') {
        (companions as Record<string, unknown>)[key] = null;
        continue;
      }
      throw new PermissionError(
        `companion '${key}' (${decl.resource}:${decl.verb}) not accessible`
      );
    }

    try {
      const result = await decl.fetch({ data: fetched, projectId });
      (companions as Record<string, unknown>)[key] = result;
    } catch (err) {
      if (decl.onError === 'tolerate') {
        logger.warn(`runDetailLoader: companion '${key}' fetch failed (tolerated)`, {
          error: err instanceof Error ? err.message : String(err),
          resource: decl.resource,
          verb: decl.verb,
        });
        (companions as Record<string, unknown>)[key] = null;
        continue;
      }
      throw err;
    }
  }

  return data(
    {
      restricted: false,
      data: fetched,
      companions,
    } satisfies DslLoaderData<TData, TCompanions>,
    { status: 200 }
  );
}
