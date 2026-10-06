import { toBackendPayload, toHttpProxyBackend } from './http-proxy.adapter';
import type { HttpProxy, CreateHttpProxyInput, UpdateHttpProxyInput } from './http-proxy.schema';
import {
  HTTP_PROXY_SYNC_KIND,
  createHttpProxyService,
  httpProxyKeys,
  type TrafficProtectionMaps,
  type TrafficProtectionView,
} from './http-proxy.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import {
  beginRowPending,
  defineResourceMutations,
  endRowPending,
  withResourceHandlers,
} from '@/modules/watch/define-resource-mutations';
import { upsertResource } from '@/modules/watch/resource-cache';
import { syncKey } from '@/modules/watch/sync-state';
import { withAllowanceRefresh } from '@/resources/allowance-buckets';
import { domainKeys } from '@/resources/domains/domain.service';
import { locationKeys } from '@/resources/locations';
import { serviceEntitlementKeys } from '@/resources/service-entitlements';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useHttpProxies(
  projectId: string,
  options?: Omit<UseQueryOptions<HttpProxy[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: httpProxyKeys.list(projectId),
    queryFn: () => createHttpProxyService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

/**
 * Proxies that reference the given connector. Uses the same cache as useHttpProxies(projectId),
 * so no extra network request when the list is already loaded; filtering is done in memory.
 */
export function useHttpProxiesByConnector(
  projectId: string,
  connectorName: string | undefined,
  options?: Omit<UseQueryOptions<HttpProxy[]>, 'queryKey' | 'queryFn' | 'select'>
) {
  return useQuery({
    queryKey: httpProxyKeys.list(projectId),
    queryFn: () => createHttpProxyService().list(projectId),
    select: (data) =>
      connectorName ? data.filter((p) => p.connector?.name === connectorName) : [],
    enabled: !!projectId && !!connectorName,
    ...options,
  });
}

export function useHttpProxy(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<HttpProxy>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: httpProxyKeys.detail(projectId, name),
    queryFn: () => createHttpProxyService().get(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}

/**
 * WAF (TrafficProtectionPolicy) modes for a project, keyed by proxy name.
 * Decoupled from the proxy list and gated by `enabled` so callers without
 * `trafficprotectionpolicies` view permission never trigger the request.
 */
export function useTrafficProtectionPolicies(
  projectId: string,
  options?: Omit<UseQueryOptions<TrafficProtectionMaps>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: httpProxyKeys.wafList(projectId),
    queryFn: () => createHttpProxyService().listTrafficProtectionPolicies(projectId),
    enabled: !!projectId,
    ...options,
  });
}

/**
 * WAF (TrafficProtectionPolicy) view for a single proxy. Gated by `enabled` so
 * callers without view permission never trigger the request.
 */
export function useTrafficProtectionPolicy(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<TrafficProtectionView | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: httpProxyKeys.wafDetail(projectId, name),
    queryFn: () => createHttpProxyService().getTrafficProtectionPolicy(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}

/**
 * The backend reconciles proxy hostnames into `Domain` resources, so a proxy
 * write can create domains no client-side domain mutation ever touched. The
 * domains list is served from cache by its route's `clientLoader`, which only
 * falls through to the server loader once the query is marked invalidated.
 */
function invalidateDomainsForHostnames(
  queryClient: QueryClient,
  projectId: string,
  hostnames: string[] | undefined
): void {
  if (hostnames === undefined) return;
  // Prefix-match on the project rather than domainKeys.list(projectId), whose
  // trailing `params` slot would miss any paginated variant of the same list.
  queryClient.invalidateQueries({ queryKey: [...domainKeys.lists(), projectId] });
}

/** Proxies are watched: mutations write the list and never invalidate it. */
export function httpProxyMutations(projectId: string) {
  return defineResourceMutations<HttpProxy>({
    kind: HTTP_PROXY_SYNC_KIND,
    scope: projectId,
    keys: {
      lists: httpProxyKeys.list(projectId),
      detail: (name) => httpProxyKeys.detail(projectId, name),
    },
    getName: (proxy) => proxy.name,
    getMeta: (proxy) => ({ name: proxy.name, resourceVersion: proxy.resourceVersion }),
    watched: true,
  });
}

export function toPendingHttpProxy(input: CreateHttpProxyInput): HttpProxy {
  return {
    uid: input.name,
    name: input.name,
    namespace: 'default',
    resourceVersion: '',
    createdAt: new Date(),
    chosenName: input.chosenName,
    endpoint: input.endpoint,
    hostnames: input.hostnames,
    tlsHostname: input.tlsHostname,
  };
}

export function useCreateHttpProxy(
  projectId: string,
  options?: UseMutationOptions<HttpProxy, Error, CreateHttpProxyInput>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: CreateHttpProxyInput) =>
      createHttpProxyService().create(projectId, input) as Promise<HttpProxy>,
    ...withResourceHandlers(
      httpProxyMutations(projectId).create(toPendingHttpProxy),
      withAllowanceRefresh(
        {
          ...options,
          onSuccess: (...args) => {
            const [, input] = args;
            // Not covered by the proxy watch, so these still invalidate.
            queryClient.invalidateQueries({ queryKey: httpProxyKeys.wafList(projectId) });
            queryClient.invalidateQueries({ queryKey: serviceEntitlementKeys.active(projectId) });
            queryClient.invalidateQueries({ queryKey: locationKeys.list(projectId) });
            invalidateDomainsForHostnames(queryClient, projectId, input.hostnames);
            return options?.onSuccess?.(...args);
          },
        },
        queryClient
      )
    ),
  });
}

type UpdateHttpProxyContext = {
  previous: HttpProxy | undefined;
  previousWaf?: TrafficProtectionView | null;
  touchesWaf?: boolean;
  /** True once this update joined the row's pending count; only then may it end it. */
  begun?: boolean;
};

type UpdateHttpProxyOptions = UseMutationOptions<
  HttpProxy,
  Error,
  UpdateHttpProxyInput,
  UpdateHttpProxyContext
>;

function applyProxyInput(old: HttpProxy, input: UpdateHttpProxyInput): HttpProxy {
  return {
    ...old,
    ...(input.endpoint !== undefined && { endpoint: input.endpoint }),
    ...(input.hostnames !== undefined && { hostnames: input.hostnames }),
    ...(input.tlsHostname !== undefined && {
      tlsHostname: input.tlsHostname.trim() || undefined,
    }),
    ...(input.chosenName !== undefined && { chosenName: input.chosenName }),
    ...(input.backends !== undefined && {
      backends: input.backends.map((backend) => toHttpProxyBackend(toBackendPayload(backend))),
    }),
    ...(input.loadBalancer !== undefined && {
      loadBalancer: input.loadBalancer ?? undefined,
    }),
    ...(input.healthCheck !== undefined && {
      healthCheck: input.healthCheck?.passive ? input.healthCheck : undefined,
    }),
    ...(input.enableHttpRedirect !== undefined && {
      enableHttpRedirect: input.enableHttpRedirect,
    }),
    ...(input.basicAuth !== undefined && {
      basicAuthEnabled: (input.basicAuth.users?.length ?? 0) > 0,
      basicAuthUserCount: input.basicAuth.users?.length ?? 0,
      basicAuthUsernames: input.basicAuth.users?.map((u) => u.username) ?? [],
    }),
  };
}

const touchesWaf = (input: UpdateHttpProxyInput): boolean =>
  !!input.removeTrafficProtection ||
  input.trafficProtectionMode !== undefined ||
  input.paranoiaLevels !== undefined ||
  input.ruleExclusions !== undefined;

function applyWafInput(
  old: TrafficProtectionView | null | undefined,
  input: UpdateHttpProxyInput
): TrafficProtectionView {
  if (input.removeTrafficProtection) {
    return { mode: undefined, paranoiaLevels: undefined, ruleExclusions: undefined };
  }
  return {
    ...old,
    mode: input.trafficProtectionMode ?? old?.mode,
    paranoiaLevels: input.paranoiaLevels ?? old?.paranoiaLevels,
    ruleExclusions:
      input.ruleExclusions === undefined
        ? old?.ruleExclusions
        : (input.ruleExclusions ?? undefined),
  };
}

async function applyOptimisticUpdate(
  queryClient: QueryClient,
  projectId: string,
  name: string,
  input: UpdateHttpProxyInput
): Promise<UpdateHttpProxyContext> {
  const detailKey = httpProxyKeys.detail(projectId, name);
  await queryClient.cancelQueries({ queryKey: detailKey });
  const previous = queryClient.getQueryData<HttpProxy>(detailKey);
  queryClient.setQueryData<HttpProxy>(detailKey, (old) => old && applyProxyInput(old, input));

  if (!touchesWaf(input)) return { previous, touchesWaf: false };
  const wafKey = httpProxyKeys.wafDetail(projectId, name);
  await queryClient.cancelQueries({ queryKey: wafKey });
  const previousWaf = queryClient.getQueryData<TrafficProtectionView | null>(wafKey);
  queryClient.setQueryData<TrafficProtectionView | null>(wafKey, (old) =>
    applyWafInput(old, input)
  );
  return { previous, previousWaf, touchesWaf: true };
}

function rollbackOptimisticUpdate(
  queryClient: QueryClient,
  projectId: string,
  name: string,
  context: UpdateHttpProxyContext | undefined
) {
  if (context?.previous != null) {
    queryClient.setQueryData(httpProxyKeys.detail(projectId, name), context.previous);
  }
  if (context?.touchesWaf) {
    queryClient.setQueryData(httpProxyKeys.wafDetail(projectId, name), context.previousWaf ?? null);
  }
}

function onUpdateSuccess(
  queryClient: QueryClient,
  projectId: string,
  name: string,
  data: HttpProxy,
  input: UpdateHttpProxyInput
) {
  upsertResource(queryClient, { lists: httpProxyKeys.list(projectId) }, data, {
    origin: 'server',
    getMeta: (proxy) => ({ name: proxy.name, resourceVersion: proxy.resourceVersion }),
  });
  // Exception to watch-or-invalidate: watch events omit redirect and basic-auth
  // fields, so only a re-GET shows them. Not awaited, or the dialog hangs (#1491).
  queryClient.invalidateQueries({ queryKey: httpProxyKeys.detail(projectId, name) });
  queryClient.invalidateQueries({ queryKey: httpProxyKeys.wafDetail(projectId, name) });
  queryClient.invalidateQueries({ queryKey: httpProxyKeys.wafList(projectId) });
  invalidateDomainsForHostnames(queryClient, projectId, input.hostnames);
}

/** Joins the shared per-row pending count so overlapping mutations don't clear each other. */
export function httpProxyUpdateOptions(
  queryClient: QueryClient,
  projectId: string,
  name: string,
  options?: UpdateHttpProxyOptions
): UpdateHttpProxyOptions {
  const key = syncKey(HTTP_PROXY_SYNC_KIND, projectId, name);
  return {
    mutationFn: (input: UpdateHttpProxyInput) => {
      const currentProxy = queryClient.getQueryData<HttpProxy>(
        httpProxyKeys.detail(projectId, name)
      );
      return createHttpProxyService().update(projectId, name, input, {
        currentProxy,
      }) as Promise<HttpProxy>;
    },
    ...options,
    onMutate: async (input, mutationContext) => {
      // Caller first: if it throws, onError gets no context and leaves the count alone.
      await options?.onMutate?.(input, mutationContext);
      const context = await applyOptimisticUpdate(queryClient, projectId, name, input);
      beginRowPending(key, 'pending-update');
      return { ...context, begun: true };
    },
    onError: (err, input, context, mutationContext) => {
      if (context?.begun) endRowPending(key, { ok: false });
      rollbackOptimisticUpdate(queryClient, projectId, name, context);
      options?.onError?.(err, input, context, mutationContext);
    },
    onSuccess: (...args) => {
      const [data, input] = args;
      onUpdateSuccess(queryClient, projectId, name, data, input);
      endRowPending(key, { ok: true });
      options?.onSuccess?.(...args);
    },
  };
}

export function useUpdateHttpProxy(
  projectId: string,
  name: string,
  options?: UpdateHttpProxyOptions
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    // Deliberately 'write', even though the service issues HTTP DELETEs on
    // sub-resources (traffic-protection / basic-auth teardown). Those are
    // configuration edits to a proxy the user is keeping, not offboarding —
    // that goes through useDeleteHttpProxy, which is 'delete' and stays
    // ungated. Gating this does not gate any user-visible delete.
    operation: 'write',
    ...httpProxyUpdateOptions(queryClient, projectId, name, options),
  });
}

export function useDeleteHttpProxy(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (name: string) => createHttpProxyService().delete(projectId, name),
    ...withResourceHandlers(
      httpProxyMutations(projectId).remove<string>((name) => name),
      withAllowanceRefresh(
        {
          ...options,
          onSuccess: (...args) => {
            const [, name] = args;
            queryClient.removeQueries({ queryKey: httpProxyKeys.wafDetail(projectId, name) });
            queryClient.invalidateQueries({ queryKey: httpProxyKeys.wafList(projectId) });
            return options?.onSuccess?.(...args);
          },
        },
        queryClient
      )
    ),
  });
}
