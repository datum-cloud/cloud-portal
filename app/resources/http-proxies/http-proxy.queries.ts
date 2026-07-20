import type { HttpProxy, CreateHttpProxyInput, UpdateHttpProxyInput } from './http-proxy.schema';
import {
  createHttpProxyService,
  httpProxyKeys,
  type TrafficProtectionMaps,
  type TrafficProtectionView,
} from './http-proxy.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
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

export function useCreateHttpProxy(
  projectId: string,
  options?: UseMutationOptions<HttpProxy, Error, CreateHttpProxyInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateHttpProxyInput) =>
      createHttpProxyService().create(projectId, input) as Promise<HttpProxy>,
    ...options,
    onSuccess: (...args) => {
      const [newHttpProxy] = args;
      queryClient.setQueryData(httpProxyKeys.detail(projectId, newHttpProxy.name), newHttpProxy);
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.wafList(projectId) });

      options?.onSuccess?.(...args);
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

  return useMutation({
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
        input.paranoiaLevels !== undefined;
      if (touchesWaf) {
        await queryClient.cancelQueries({ queryKey: httpProxyKeys.wafDetail(projectId, name) });
        previousWaf = queryClient.getQueryData<TrafficProtectionView | null>(
          httpProxyKeys.wafDetail(projectId, name)
        );
        queryClient.setQueryData<TrafficProtectionView | null>(
          httpProxyKeys.wafDetail(projectId, name),
          (old) => {
            if (input.removeTrafficProtection)
              return { mode: undefined, paranoiaLevels: undefined };
            return {
              mode: input.trafficProtectionMode ?? old?.mode,
              paranoiaLevels: input.paranoiaLevels ?? old?.paranoiaLevels,
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
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: httpProxyKeys.detail(projectId, name) });
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.wafDetail(projectId, name) });
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.wafList(projectId) });

      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteHttpProxy(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
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
    },
  });
}
