import type { HttpProxy, CreateHttpProxyInput, UpdateHttpProxyInput } from './http-proxy.schema';
import { createHttpProxyService, httpProxyKeys } from './http-proxy.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

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

      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateHttpProxy(
  projectId: string,
  name: string,
  options?: UseMutationOptions<HttpProxy, Error, UpdateHttpProxyInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateHttpProxyInput) =>
      createHttpProxyService().update(projectId, name, input) as Promise<HttpProxy>,
    ...options,
    onSuccess: async (...args) => {
      // Invalidate and refetch both detail and list queries to ensure WAF mode and paranoia levels are refreshed
      // We refetch because paranoia levels come from a separate TrafficProtectionPolicy that's fetched in get()
      await queryClient.invalidateQueries({ queryKey: httpProxyKeys.detail(projectId, name) });
      await queryClient.refetchQueries({ queryKey: httpProxyKeys.detail(projectId, name) });
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.list(projectId) });

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

      options?.onSuccess?.(...args);
    },
  });
}

/**
 * Hydrates React Query cache with SSR data for HTTP proxies list.
 */
export function useHydrateHttpProxies(projectId: string, initialData: HttpProxy[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(httpProxyKeys.list(projectId), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, initialData]);
}

/**
 * Hydrates React Query cache with SSR data for single HTTP proxy.
 */
export function useHydrateHttpProxy(projectId: string, name: string, initialData: HttpProxy) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(httpProxyKeys.detail(projectId, name), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, name, initialData]);
}
