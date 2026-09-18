import {
  canInLoaderBulk,
  gateRouteAccess,
  recordGateDenial,
  type LoaderPermissionCheck,
} from './server/check-permission';
import type {
  CompanionDeclaration,
  RunListLoaderInput,
  RunDetailLoaderInput,
  RunRouteGateInput,
  DslLoaderData,
  GateLoaderData,
} from './types';
import { logger } from '@/modules/logger';
import { redirectWithToast } from '@/utils/cookies';
import { BadRequestError, PermissionError } from '@/utils/errors';
// NotFoundError is intentionally sourced directly from `app-error` to disambiguate
// from the http-layer `NotFoundError` (one-arg form). We need the (resource, identifier)
// form here so the message reads `<resource> '<id>' not found`. The `@/utils/errors`
// barrel re-exports both under aliased names — see app/utils/errors/index.ts.
import { AppError, NotFoundError } from '@/utils/errors/app-error';
import { data, type LoaderFunctionArgs } from 'react-router';

/**
 * Convert thrown `AppError` instances into `Response` objects so React Router
 * preserves the HTTP status (404, 403, …) and the JSON body becomes
 * `error.data` inside the route error boundary. Mirrors `withLoaderErrors`
 * (`app/utils/errors/loader.ts`). Routes call these runtime functions
 * directly (no `withLoaderErrors` wrap at the call site), so the mapping
 * has to live inside the runtime — otherwise a service that throws
 * `NotFoundError` surfaces as a generic 500 instead of a 404.
 *
 * Scope note: the repo currently ships two `AppError` classes — the newer
 * `app/utils/errors/app-error.ts` (status-aware, extended by `NotFoundError`,
 * `ValidationError`, `AuthenticationError`, `AuthorizationError`,
 * `ConflictError`, `RateLimitError`) and the legacy `app/utils/errors/base.ts`
 * (extended by `BadRequestError` and the older `http.ts` family). We only
 * map the modern one here, matching `withLoaderErrors`'s behavior. Errors
 * from the legacy hierarchy fall through unchanged (React Router still
 * renders the route boundary, just without the precise 4xx status). If/when
 * the two hierarchies are unified, broaden the check accordingly.
 */
function rethrowAsResponse(error: unknown): never {
  if (error instanceof AppError) {
    throw error.toResponse();
  }
  throw error;
}

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

type ScopeContext = {
  projectId?: string;
  orgId?: string;
  /** First positional arg passed to gateRouteAccess. */
  gateScopeId: string;
};

/**
 * Resolve URL params into the per-scope identifier(s) and the positional
 * `gateScopeId` consumed by `gateRouteAccess`. See
 * `RbacService.resolveBaseURL` (app/modules/rbac/server/rbac.service.ts) for
 * how each scope interprets the first arg:
 * - 'project': arg is ignored, base URL derives from `check.projectId`.
 * - 'org': arg is the real org identifier used in the base URL.
 * - 'user': arg is ignored, base URL is root-scoped.
 */
function resolveScopeContext(
  scope: 'project' | 'org' | 'user' | undefined,
  args: LoaderFunctionArgs
): ScopeContext {
  const s = scope ?? 'project';
  if (s === 'project') {
    const projectId = args.params.projectId;
    if (!projectId) {
      throw new BadRequestError('Project ID is required');
    }
    // For scope='project', gateRouteAccess's first arg is ignored by
    // RbacService.resolveBaseURL — it reads check.projectId instead. We pass
    // projectId here for consistency with the existing pattern.
    return { projectId, gateScopeId: projectId };
  }
  if (s === 'org') {
    const orgId = args.params.orgId;
    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }
    // For scope='org', RbacService.resolveBaseURL uses the first arg as the
    // organization identifier.
    return { orgId, gateScopeId: orgId };
  }
  // scope='user': no URL-derived scope identifier. resolveBaseURL ignores
  // the first arg for user-scope checks (root-scoped base URL).
  return { gateScopeId: '' };
}

export async function runListLoader<TData>(
  args: LoaderFunctionArgs,
  cfg: RunListLoaderInput<TData>
) {
  try {
    const ctx = resolveScopeContext(cfg.scope, args);

    // gateRouteAccess's first positional arg is interpreted per cfg.scope —
    // see resolveScopeContext + RbacService.resolveBaseURL (project no-op,
    // org real id, user empty string).
    const allowed = await gateRouteAccess(ctx.gateScopeId, {
      resource: cfg.resource,
      verb: 'list',
      group: cfg.group ?? '',
      namespace: cfg.namespace,
      scope: cfg.scope ?? 'project',
      projectId: ctx.projectId,
    });

    if (!allowed) {
      return data({ restricted: true } satisfies DslLoaderData<TData, Record<string, never>>);
    }

    const result = await cfg.fetch({
      projectId: ctx.projectId,
      orgId: ctx.orgId,
      args,
    });
    return data({
      restricted: false,
      data: result,
      companions: {},
    } satisfies DslLoaderData<TData, Record<string, never>>);
  } catch (error) {
    rethrowAsResponse(error);
  }
}

/**
 * Gate-only loader for routes that gate access but fetch no resource —
 * create/"new" pages, action pages, and non-`get` settings sub-routes.
 *
 * Mirrors `runListLoader`'s gate, minus the fetch/seed: it reuses
 * `resolveScopeContext` (so `projectId` is always set for project scope —
 * the footgun that bit the inline `gateRouteAccess` callers) and the shared
 * `rethrowAsResponse` AppError→Response mapping. Returns the `GateLoaderData`
 * envelope; pair with `defineResourceRoute({ type: 'gate' })` on the page.
 */
export async function runRouteGate(args: LoaderFunctionArgs, cfg: RunRouteGateInput) {
  try {
    const ctx = resolveScopeContext(cfg.scope, args);

    // gateRouteAccess's first positional arg is interpreted per cfg.scope —
    // see resolveScopeContext + RbacService.resolveBaseURL (project no-op,
    // org real id, user empty string).
    const allowed = await gateRouteAccess(ctx.gateScopeId, {
      resource: cfg.resource,
      verb: cfg.verb,
      group: cfg.group ?? '',
      namespace: cfg.namespace,
      scope: cfg.scope ?? 'project',
      projectId: ctx.projectId,
      // For scope='user' gates the URL :param is the resource name, not a
      // scope identifier — pass it via check.name (mirrors runDetailLoader).
      name: cfg.name,
    });

    return data({ restricted: !allowed } satisfies GateLoaderData);
  } catch (error) {
    rethrowAsResponse(error);
  }
}

export async function runDetailLoader<TData, TCompanions extends Record<string, unknown>>(
  args: LoaderFunctionArgs,
  cfg: RunDetailLoaderInput<TData, TCompanions>
) {
  try {
    const ctx = resolveScopeContext(cfg.scope, args);

    const id = args.params[cfg.paramName];
    if (!id) {
      throw new BadRequestError(`${cfg.paramName} is required`);
    }

    // Every access review this route needs — the route gate plus one per declared
    // companion — resolved in a single fan-out. Companion gates read only URL
    // params, never fetched data, so nothing forces them to queue behind the
    // primary fetch.
    //
    // Verdicts are computed here but CONSUMED at the same points as the old
    // sequential flow (route denial immediately below; companions only after the
    // primary fetch and the deletion redirect). That is deliberate:
    // `recordGateDenial` fires only where a gate is actually acted on, so
    // `rbac_permission_denied_total` keeps counting exactly what it counted when
    // each gate was its own round trip.
    const routeCheck: LoaderPermissionCheck = {
      resource: cfg.resource,
      verb: 'get',
      group: cfg.group ?? '',
      namespace: cfg.namespace,
      scope: cfg.scope ?? 'project',
      projectId: ctx.projectId,
      // For scope='user' detail routes (e.g. organizations:get), the URL :paramName
      // is the resource name, not a scope identifier. Pass it via check.name.
      name: cfg.scope === 'user' ? id : undefined,
    };

    // The cast on `cfg.companions` widens each entry's `TCompanionData` generic
    // to `unknown` so we can iterate uniformly.
    const companionEntries = Object.entries(cfg.companions ?? {}) as Array<
      [string, CompanionDeclaration<TData, unknown>]
    >;
    const companionChecks: LoaderPermissionCheck[] = companionEntries.map(([, decl]) => ({
      resource: decl.resource,
      verb: decl.verb,
      group: decl.group ?? '',
      namespace: decl.namespace,
      scope: decl.scope,
      projectId: ctx.projectId,
      name: decl.scope === 'user' ? id : undefined,
    }));

    const verdicts = await canInLoaderBulk(ctx.gateScopeId, [routeCheck, ...companionChecks]);

    // `?? false` keeps the fail-closed posture explicit rather than incidental,
    // in case the verdict array is ever shorter than the checks it was built from.
    if (!(verdicts[0] ?? false)) {
      recordGateDenial(routeCheck);
      return data({ restricted: true } satisfies DslLoaderData<TData, TCompanions>);
    }

    const fetched = await cfg.fetch({
      projectId: ctx.projectId,
      orgId: ctx.orgId,
      id,
      args,
    });
    if (!fetched) {
      throw new NotFoundError(cfg.notFoundLabel, id);
    }

    // Redirect-on-deletion runs after the primary fetch (we need the data to
    // inspect deletionTimestamp or similar) but before any companion fetch — no
    // point loading domain data for a record that's vanishing.
    if (cfg.redirectIfDeleting) {
      const descriptor = cfg.redirectIfDeleting({
        data: fetched,
        projectId: ctx.projectId,
        orgId: ctx.orgId,
      });
      if (descriptor) {
        return redirectWithToast(descriptor.to, {
          title: descriptor.toast.title,
          description: descriptor.toast.description,
          type: descriptor.toast.type ?? 'message',
        });
      }
    }

    // Companion resolution runs in two passes. Semantics per companion are
    // unchanged:
    // - Gate denied + `tolerate` → companion = null, no network call made.
    // - Gate denied + `propagate` → throws (programmer-error: a route shouldn't
    //   declare a companion the primary-allowed user cannot access).
    // - Fetch throws + `tolerate` → companion = null, warning logged.
    // - Fetch throws + `propagate` → re-throws (caught by route error boundary).
    //
    // Why two passes instead of one loop that decides as it goes:
    // 1. Pass 1 starts every allowed fetch and throws NOTHING. Throwing while a
    //    sibling fetch is in flight orphans that promise, and its later rejection
    //    surfaces as a process-level unhandled rejection rather than a route error.
    // 2. Pass 2 makes every throw/tolerate decision — gate-denied and
    //    fetch-rejected alike — in declaration order, so the first declared
    //    failure is the one that escapes, exactly as the old sequential loop
    //    short-circuited. Splitting the two kinds of failure across the passes
    //    would let a later gate denial beat an earlier fetch error.
    // 3. `recordGateDenial` fires in pass 2, so a companion whose verdict was
    //    resolved but never reached (route denied, primary 404, deletion
    //    redirect) is never counted as a denial.
    //
    // The `companions` Record cast is necessary because TypeScript can't narrow
    // dynamic string-key writes; the final `as TCompanions` is safe by
    // construction (each key maps 1:1 to the declared `TCompanions[K]`).
    type CompanionSlot =
      | {
          kind: 'denied';
          key: string;
          decl: CompanionDeclaration<TData, unknown>;
          check: LoaderPermissionCheck;
        }
      | { kind: 'fetch'; key: string; decl: CompanionDeclaration<TData, unknown>; at: number };

    const inFlight: Array<Promise<unknown>> = [];
    const slots: CompanionSlot[] = companionEntries.map(([key, decl], index) => {
      // verdicts[0] is the route gate, so companion `index` sits at `index + 1`.
      if (!(verdicts[index + 1] ?? false)) {
        return { kind: 'denied', key, decl, check: companionChecks[index] };
      }
      const at = inFlight.length;
      // Companions in Phase 2 are same-scope as the parent route. The companion
      // fetch ctx still types `projectId: string` — fall back to empty string for
      // non-project scopes (companion declarations on org-/user-scope routes are
      // not used today).
      //
      // Wrapped in `Promise.resolve().then(...)` so a `decl.fetch` that throws
      // synchronously becomes a rejected promise this pass can carry, rather than
      // escaping mid-pass and orphaning its siblings.
      inFlight.push(
        Promise.resolve().then(() => decl.fetch({ data: fetched, projectId: ctx.projectId ?? '' }))
      );
      return { kind: 'fetch', key, decl, at };
    });

    const settled = await Promise.allSettled(inFlight);

    const companions = {} as TCompanions;

    for (const slot of slots) {
      if (slot.kind === 'denied') {
        recordGateDenial(slot.check);
        if (slot.decl.onError === 'tolerate') {
          (companions as Record<string, unknown>)[slot.key] = null;
          continue;
        }
        throw new PermissionError(
          `companion '${slot.key}' (${slot.decl.resource}:${slot.decl.verb}) not accessible`
        );
      }

      const outcome = settled[slot.at];
      if (outcome.status === 'fulfilled') {
        (companions as Record<string, unknown>)[slot.key] = outcome.value;
        continue;
      }

      if (slot.decl.onError === 'tolerate') {
        logger.warn(`runDetailLoader: companion '${slot.key}' fetch failed (tolerated)`, {
          error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
          resource: slot.decl.resource,
          verb: slot.decl.verb,
        });
        (companions as Record<string, unknown>)[slot.key] = null;
        continue;
      }

      throw outcome.reason;
    }

    // Build response init — start with status, layer in optional headers from cfg.setHeaders.
    let responseInit: ResponseInit = { status: 200 };
    if (cfg.setHeaders) {
      const headers = await cfg.setHeaders({
        data: fetched,
        projectId: ctx.projectId,
        orgId: ctx.orgId,
        args,
      });
      if (headers) {
        responseInit = { status: 200, headers };
      }
    }

    return data(
      {
        restricted: false,
        data: fetched,
        companions,
      } satisfies DslLoaderData<TData, TCompanions>,
      responseInit
    );
  } catch (error) {
    rethrowAsResponse(error);
  }
}
