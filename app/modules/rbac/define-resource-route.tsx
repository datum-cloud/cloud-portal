import { GuardedPage } from './components/GuardedPage';
import type { DefineListPageInput, DefineDetailPageInput, DslLoaderData } from './types';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { useCallback } from 'react';
import { useLoaderData, useParams, type MetaFunction } from 'react-router';

/**
 * Canonical RBAC route convention — CLIENT-SAFE module.
 *
 * Produces the page-side primitives (`Page` HOF, `meta`, `handle`) for a route
 * declared with the DSL. The matching server-side loader runtime lives in
 * `run-resource-loader.ts` and is imported separately by each route file as a
 * top-level `loader` export. See that file's header for the split rationale.
 *
 * IMPORTANT: do not introduce server-only imports here (e.g. `gateRouteAccess`,
 * `redirectWithToast`, `prom-client`). Anything imported at this file's top is
 * pulled into the browser bundle because `defineResourceRoute(...)` is called
 * on the client to wire `Page`/`meta`/`handle`. The Vite bundler errors
 * loudly if you violate this — see the dev-server stack trace in the hotfix
 * commit for the original failure mode.
 */

interface DefineListRouteOutput<TData> {
  meta: MetaFunction;
  Page: (
    render: (props: { data: TData; companions: Record<string, never> }) => React.ReactNode
  ) => () => React.ReactElement;
}

interface DefineDetailRouteOutput<TData, TCompanions extends Record<string, unknown>> {
  handle: {
    breadcrumb: (loaderData: DslLoaderData<TData, TCompanions> | undefined) => React.ReactNode;
  };
  meta: MetaFunction;
  Page: (
    render: (props: { data: TData; companions: TCompanions }) => React.ReactNode
  ) => () => React.ReactElement;
}

export function defineResourceRoute<TData>(
  input: DefineListPageInput
): DefineListRouteOutput<TData>;

export function defineResourceRoute<
  TData,
  TCompanions extends Record<string, unknown> = Record<string, never>,
>(input: DefineDetailPageInput<TData, TCompanions>): DefineDetailRouteOutput<TData, TCompanions>;

export function defineResourceRoute(input: unknown): unknown {
  const cfg = input as
    | DefineListPageInput
    | DefineDetailPageInput<unknown, Record<string, unknown>>;

  if (cfg.type === 'list') {
    return defineListRoute(cfg);
  }
  return defineDetailRoute(cfg);
}

function defineListRoute<TData>(cfg: DefineListPageInput): DefineListRouteOutput<TData> {
  const meta: MetaFunction = mergeMeta(() => metaObject(cfg.metaTitle ?? cfg.resource));

  const Page: DefineListRouteOutput<TData>['Page'] = (render) => {
    return function GuardedRouteOutlet() {
      const loaderData = useLoaderData<DslLoaderData<TData, Record<string, never>>>();
      const { projectId = '' } = useParams<{ projectId: string }>();
      // Identity-stable seedCache so GuardedPage's seed effect doesn't re-fire on
      // every render of consumers under this Page (e.g. when a permission check
      // resolves and downstream components re-render). An unstable seedCache
      // identity caused redundant qc.setQueryData calls that interacted poorly
      // with the watch-stream lifecycle (see fix(rbac) commit notes).
      const seedCache = useCallback(
        ({ data: d }: { data: TData; companions: Record<string, never> }) =>
          cfg.seedCache!({ data: d, projectId }),
        [projectId]
      );
      return (
        <GuardedPage
          loaderData={loaderData}
          restrictedTitle={cfg.restrictedTitle}
          restrictedMessage={cfg.restrictedMessage}
          seedCache={cfg.seedCache ? seedCache : undefined}>
          {(d, companions) => render({ data: d, companions })}
        </GuardedPage>
      );
    };
  };

  return { meta, Page };
}

function defineDetailRoute<TData, TCompanions extends Record<string, unknown>>(
  cfg: DefineDetailPageInput<TData, TCompanions>
): DefineDetailRouteOutput<TData, TCompanions> {
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
      // See identical note in defineListRoute: identity-stable seedCache prevents
      // GuardedPage's seed effect from re-firing on every consumer re-render.
      const seedCache = useCallback(
        ({ data: d, companions: c }: { data: TData; companions: TCompanions }) =>
          cfg.seedCache!({ data: d, companions: c, projectId, id }),
        [projectId, id]
      );
      return (
        <GuardedPage
          loaderData={loaderData}
          restrictedTitle={cfg.restrictedTitle}
          restrictedMessage={cfg.restrictedMessage}
          seedCache={cfg.seedCache ? seedCache : undefined}>
          {(d, companions) => render({ data: d, companions })}
        </GuardedPage>
      );
    };
  };

  return { handle, meta, Page };
}
