import type {
  HttpProxy,
  CreateHttpProxyInput,
  UpdateHttpProxyInput,
  ProxyRoute,
  ProxyLoadBalancer,
} from './http-proxy.schema';
import {
  createHttpProxyService,
  httpProxyKeys,
  type TrafficProtectionMaps,
  type TrafficProtectionView,
} from './http-proxy.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import { invalidateAllowanceBuckets } from '@/resources/allowance-buckets';
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

export function useCreateHttpProxy(
  projectId: string,
  options?: UseMutationOptions<HttpProxy, Error, CreateHttpProxyInput>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: CreateHttpProxyInput) =>
      createHttpProxyService().create(projectId, input) as Promise<HttpProxy>,
    ...options,
    onSuccess: (...args) => {
      const [newHttpProxy, input] = args;
      queryClient.setQueryData(httpProxyKeys.detail(projectId, newHttpProxy.name), newHttpProxy);
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.wafList(projectId) });
      queryClient.invalidateQueries({ queryKey: serviceEntitlementKeys.active(projectId) });
      queryClient.invalidateQueries({ queryKey: locationKeys.list(projectId) });
      invalidateDomainsForHostnames(queryClient, projectId, input.hostnames);

      options?.onSuccess?.(...args);
      void invalidateAllowanceBuckets(queryClient);
    },
  });
}

export function useUpdateHttpProxy(
  projectId: string,
  name: string,
  options?: UseMutationOptions<
    HttpProxy,
    Error,
    UpdateHttpProxyInput,
    {
      previous: HttpProxy | undefined;
      previousWaf?: TrafficProtectionView | null;
      touchesWaf?: boolean;
    }
  >
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    // Deliberately 'write', even though the service issues HTTP DELETEs on
    // sub-resources (traffic-protection / basic-auth teardown). Those are
    // configuration edits to a proxy the user is keeping, not offboarding —
    // that goes through useDeleteHttpProxy, which is 'delete' and stays
    // ungated. Gating this does not gate any user-visible delete.
    operation: 'write',
    mutationFn: (input: UpdateHttpProxyInput) => {
      const currentProxy = queryClient.getQueryData<HttpProxy>(
        httpProxyKeys.detail(projectId, name)
      );
      return createHttpProxyService().update(projectId, name, input, {
        currentProxy,
      }) as Promise<HttpProxy>;
    },
    ...options,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: httpProxyKeys.detail(projectId, name) });
      const previous = queryClient.getQueryData<HttpProxy>(httpProxyKeys.detail(projectId, name));
      queryClient.setQueryData<HttpProxy>(httpProxyKeys.detail(projectId, name), (old) => {
        if (!old) return old;
        return {
          ...old,
          ...(input.endpoint !== undefined && { endpoint: input.endpoint }),
          ...(input.hostnames !== undefined && { hostnames: input.hostnames }),
          ...(input.tlsHostname !== undefined && {
            tlsHostname: input.tlsHostname.trim() || undefined,
          }),
          ...(input.chosenName !== undefined && { chosenName: input.chosenName }),
          ...(input.enableHttpRedirect !== undefined && {
            enableHttpRedirect: input.enableHttpRedirect,
          }),
          ...(input.basicAuth !== undefined && {
            basicAuthEnabled: (input.basicAuth.users?.length ?? 0) > 0,
            basicAuthUserCount: input.basicAuth.users?.length ?? 0,
            basicAuthUsernames: input.basicAuth.users?.map((u) => u.username) ?? [],
          }),
        };
      });

      // WAF lives in its own (permission-gated) cache now — update it separately.
      let previousWaf: TrafficProtectionView | null | undefined;
      const touchesWaf =
        input.removeTrafficProtection ||
        input.trafficProtectionMode !== undefined ||
        input.paranoiaLevels !== undefined ||
        input.ruleExclusions !== undefined;
      if (touchesWaf) {
        await queryClient.cancelQueries({ queryKey: httpProxyKeys.wafDetail(projectId, name) });
        previousWaf = queryClient.getQueryData<TrafficProtectionView | null>(
          httpProxyKeys.wafDetail(projectId, name)
        );
        queryClient.setQueryData<TrafficProtectionView | null>(
          httpProxyKeys.wafDetail(projectId, name),
          (old) => {
            if (input.removeTrafficProtection)
              return { mode: undefined, paranoiaLevels: undefined, ruleExclusions: undefined };
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
        );
      }
      return { previous, previousWaf, touchesWaf };
    },
    onError: (err, _input, context, mutationContext) => {
      if (context?.previous != null) {
        queryClient.setQueryData(httpProxyKeys.detail(projectId, name), context.previous);
      }
      if (context?.touchesWaf) {
        queryClient.setQueryData(
          httpProxyKeys.wafDetail(projectId, name),
          context.previousWaf ?? null
        );
      }
      options?.onError?.(err, _input, context, mutationContext);
    },
    onSuccess: (...args) => {
      const [, input] = args;
      // Not awaited: `onMutate` already applied the optimistic edit, and an
      // awaited invalidation holds `mutateAsync` open for a full re-GET, which
      // strands the calling dialog in its saving state (#1491).
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.detail(projectId, name) });
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.wafDetail(projectId, name) });
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.wafList(projectId) });
      invalidateDomainsForHostnames(queryClient, projectId, input.hostnames);

      options?.onSuccess?.(...args);
    },
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
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      await queryClient.cancelQueries({ queryKey: httpProxyKeys.detail(projectId, name) });
      // Invalidate list so it refetches without the deleted item
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.list(projectId) });
      queryClient.removeQueries({ queryKey: httpProxyKeys.wafDetail(projectId, name) });
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.wafList(projectId) });

      options?.onSuccess?.(...args);
      void invalidateAllowanceBuckets(queryClient);
    },
  });
}

/**
 * Replace the proxy's routes and backend pools.
 *
 * Optimistically writes `routes` into the cached proxy so the table and the
 * distribution bar settle immediately. `rawRules` is deliberately *not*
 * patched: it mirrors what the API holds, and guessing at it would let the
 * next write splice onto rules that were never persisted. The refetch in
 * onSettled brings back the authoritative pair.
 */
export function useUpdateProxyRoutes(
  projectId: string,
  name: string,
  options?: UseMutationOptions<HttpProxy, Error, ProxyRoute[]>
) {
  const queryClient = useQueryClient();
  const detailKey = httpProxyKeys.detail(projectId, name);

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (routes: ProxyRoute[]) => {
      const current = queryClient.getQueryData<HttpProxy>(detailKey);
      return createHttpProxyService().updateRoutes(
        projectId,
        name,
        routes,
        current?.rawRules ?? []
      );
    },
    ...options,
    onMutate: async (routes) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<HttpProxy>(detailKey);
      if (previous) {
        queryClient.setQueryData<HttpProxy>(detailKey, { ...previous, routes });
      }
      return { previous };
    },
    onError: (error, variables, context, mutationContext) => {
      const previous = (context as { previous?: HttpProxy } | undefined)?.previous;
      if (previous) queryClient.setQueryData(detailKey, previous);
      options?.onError?.(error, variables, context as never, mutationContext);
    },
    onSettled: (...args) => {
      queryClient.invalidateQueries({ queryKey: detailKey });
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.list(projectId) });
      options?.onSettled?.(...args);
    },
  });
}

/** Set the load balancing algorithm; `null` restores Envoy's own default. */
export function useUpdateProxyLoadBalancer(
  projectId: string,
  name: string,
  options?: UseMutationOptions<HttpProxy, Error, ProxyLoadBalancer | null>
) {
  const queryClient = useQueryClient();
  const detailKey = httpProxyKeys.detail(projectId, name);

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (loadBalancer: ProxyLoadBalancer | null) =>
      createHttpProxyService().updateLoadBalancer(projectId, name, loadBalancer),
    ...options,
    onMutate: async (loadBalancer) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<HttpProxy>(detailKey);
      if (previous) {
        const next = { ...previous };
        if (loadBalancer) next.loadBalancer = loadBalancer;
        else delete next.loadBalancer;
        queryClient.setQueryData<HttpProxy>(detailKey, next);
      }
      return { previous };
    },
    onError: (error, variables, context, mutationContext) => {
      const previous = (context as { previous?: HttpProxy } | undefined)?.previous;
      if (previous) queryClient.setQueryData(detailKey, previous);
      options?.onError?.(error, variables, context as never, mutationContext);
    },
    onSettled: (...args) => {
      queryClient.invalidateQueries({ queryKey: detailKey });
      options?.onSettled?.(...args);
    },
  });
}
