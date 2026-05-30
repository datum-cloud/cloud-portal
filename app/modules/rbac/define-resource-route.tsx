import { GuardedPage } from './components/GuardedPage';
import { gateRouteAccess } from './server/check-permission';
import type {
  CompanionDeclaration,
  DefineListRouteInput,
  DefineDetailRouteInput,
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
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import {
  data,
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';

/**
 * Loader return type for DSL-emitted list routes. Bound to React Router's
 * `data()` utility's return shape — when callers migrate React Router versions,
 * this is the one place to verify the type still resolves correctly.
 */
type DslListLoaderReturn<TData, TCompanions extends Record<string, unknown>> = Promise<
  ReturnType<typeof data<DslLoaderData<TData, TCompanions>>>
>;

/**
 * Loader return type for DSL-emitted detail routes. Same as the list variant
 * plus a `Response` arm for the `redirectIfDeleting` path — `redirectWithToast`
 * returns a raw 302 Response.
 */
type DslDetailLoaderReturn<TData, TCompanions extends Record<string, unknown>> = Promise<
  Response | ReturnType<typeof data<DslLoaderData<TData, TCompanions>>>
>;

interface DefineListRouteOutput<TData> {
  loader: (args: LoaderFunctionArgs) => DslListLoaderReturn<TData, Record<string, never>>;
  meta: MetaFunction;
  Page: (
    render: (props: { data: TData; companions: Record<string, never> }) => React.ReactNode
  ) => () => React.ReactElement;
}

interface DefineDetailRouteOutput<TData, TCompanions extends Record<string, unknown>> {
  loader: (args: LoaderFunctionArgs) => DslDetailLoaderReturn<TData, TCompanions>;
  handle: {
    breadcrumb: (loaderData: DslLoaderData<TData, TCompanions> | undefined) => React.ReactNode;
  };
  meta: MetaFunction;
  Page: (
    render: (props: { data: TData; companions: TCompanions }) => React.ReactNode
  ) => () => React.ReactElement;
}

export function defineResourceRoute<TData>(
  input: DefineListRouteInput<TData>
): DefineListRouteOutput<TData>;

export function defineResourceRoute<
  TData,
  TCompanions extends Record<string, unknown> = Record<string, never>,
>(input: DefineDetailRouteInput<TData, TCompanions>): DefineDetailRouteOutput<TData, TCompanions>;

export function defineResourceRoute(input: unknown): unknown {
  const cfg = input as
    | DefineListRouteInput<unknown>
    | DefineDetailRouteInput<unknown, Record<string, unknown>>;

  if (cfg.type === 'list') {
    return defineListRoute(cfg);
  }
  return defineDetailRoute(cfg);
}

function defineListRoute<TData>(cfg: DefineListRouteInput<TData>): DefineListRouteOutput<TData> {
  const loader: DefineListRouteOutput<TData>['loader'] = async (args) => {
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
  };

  const meta: MetaFunction = mergeMeta(() => metaObject(cfg.metaTitle ?? cfg.resource));

  const Page: DefineListRouteOutput<TData>['Page'] = (render) => {
    return function GuardedRouteOutlet() {
      const loaderData = useLoaderData<DslLoaderData<TData, Record<string, never>>>();
      const { projectId = '' } = useParams<{ projectId: string }>();
      return (
        <GuardedPage
          loaderData={loaderData}
          restrictedTitle={cfg.restrictedTitle}
          restrictedMessage={cfg.restrictedMessage}
          seedCache={
            cfg.seedCache ? ({ data: d }) => cfg.seedCache!({ data: d, projectId }) : undefined
          }>
          {(d, companions) => render({ data: d, companions })}
        </GuardedPage>
      );
    };
  };

  return { loader, meta, Page };
}

function defineDetailRoute<TData, TCompanions extends Record<string, unknown>>(
  cfg: DefineDetailRouteInput<TData, TCompanions>
): DefineDetailRouteOutput<TData, TCompanions> {
  const loader: DefineDetailRouteOutput<TData, TCompanions>['loader'] = async (args) => {
    const projectId = args.params.projectId;
    if (!projectId) {
      throw new BadRequestError('Project ID is required');
    }
    const id = args.params[cfg.paramName];
    if (!id) {
      throw new BadRequestError(`${cfg.paramName} is required`);
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
          logger.warn(`defineResourceRoute: companion '${key}' fetch failed (tolerated)`, {
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
  };

  const handle: DefineDetailRouteOutput<TData, TCompanions>['handle'] = {
    breadcrumb: (loaderData) => {
      if (cfg.breadcrumb) {
        return cfg.breadcrumb({
          data: loaderData && !loaderData.restricted ? loaderData.data : undefined,
          companions: loaderData && !loaderData.restricted ? loaderData.companions : undefined,
        });
      }
      return null;
    },
  };

  const meta: MetaFunction = mergeMeta((args) => {
    // MetaFunction's args.loaderData is typed as `unknown` at construction time
    // because we don't have a concrete loader reference to feed `MetaFunction<typeof loader>`.
    // The cast is safe — this meta function is only wired to routes produced by
    // `defineDetailRoute`, whose loader always returns this envelope shape.
    const loaderData = args.loaderData as DslLoaderData<TData, TCompanions> | undefined;
    if (typeof cfg.metaTitle === 'function') {
      const value = cfg.metaTitle({
        data: loaderData && !loaderData.restricted ? loaderData.data : undefined,
      });
      return metaObject(value);
    }
    return metaObject(cfg.metaTitle ?? cfg.notFoundLabel);
  });

  const Page: DefineDetailRouteOutput<TData, TCompanions>['Page'] = (render) => {
    return function GuardedDetailOutlet() {
      const loaderData = useLoaderData<DslLoaderData<TData, TCompanions>>();
      const params = useParams<Record<string, string>>();
      const projectId = params.projectId ?? '';
      const id = params[cfg.paramName] ?? '';
      return (
        <GuardedPage
          loaderData={loaderData}
          restrictedTitle={cfg.restrictedTitle}
          restrictedMessage={cfg.restrictedMessage}
          seedCache={
            cfg.seedCache
              ? ({ data: d, companions: c }) =>
                  cfg.seedCache!({ data: d, companions: c, projectId, id })
              : undefined
          }>
          {(d, companions) => render({ data: d, companions })}
        </GuardedPage>
      );
    };
  };

  return { loader, handle, meta, Page };
}
