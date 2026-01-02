import type { HttpProxy, CreateHttpProxyInput, UpdateHttpProxyInput } from './http-proxy.schema';
import { createHttpProxyService, httpProxyKeys } from './http-proxy.service';
import { useServiceContext } from '@/providers/service.provider';
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
  const ctx = useServiceContext();
  const service = createHttpProxyService(ctx);

  return useQuery({
    queryKey: httpProxyKeys.list(projectId),
    queryFn: () => service.list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useHttpProxy(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<HttpProxy>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createHttpProxyService(ctx);

  return useQuery({
    queryKey: httpProxyKeys.detail(projectId, name),
    queryFn: () => service.get(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}

export function useCreateHttpProxy(
  projectId: string,
  options?: UseMutationOptions<HttpProxy, Error, CreateHttpProxyInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createHttpProxyService(ctx);

  return useMutation({
    mutationFn: (input: CreateHttpProxyInput) =>
      service.create(projectId, input) as Promise<HttpProxy>,
    onSuccess: (newHttpProxy) => {
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.lists() });
      queryClient.setQueryData(httpProxyKeys.detail(projectId, newHttpProxy.name), newHttpProxy);
    },
    ...options,
  });
}

type UpdateHttpProxyContext = { previous: HttpProxy | undefined };

export function useUpdateHttpProxy(
  projectId: string,
  name: string,
  options?: UseMutationOptions<HttpProxy, Error, UpdateHttpProxyInput, UpdateHttpProxyContext>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createHttpProxyService(ctx);

  return useMutation<HttpProxy, Error, UpdateHttpProxyInput, UpdateHttpProxyContext>({
    mutationFn: (input: UpdateHttpProxyInput) =>
      service.update(projectId, name, input) as Promise<HttpProxy>,
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: httpProxyKeys.detail(projectId, name),
      });

      const previous = queryClient.getQueryData<HttpProxy>(httpProxyKeys.detail(projectId, name));

      if (previous) {
        queryClient.setQueryData(httpProxyKeys.detail(projectId, name), {
          ...previous,
          endpoint: input.endpoint ?? previous.endpoint,
          hostnames: input.hostnames ?? previous.hostnames,
        });
      }

      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(httpProxyKeys.detail(projectId, name), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: httpProxyKeys.detail(projectId, name),
      });
      queryClient.invalidateQueries({
        queryKey: httpProxyKeys.lists(),
      });
    },
    ...options,
  });
}

export function useDeleteHttpProxy(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createHttpProxyService(ctx);

  return useMutation({
    mutationFn: (name: string) => service.delete(projectId, name),
    onSuccess: (_data, name) => {
      queryClient.removeQueries({
        queryKey: httpProxyKeys.detail(projectId, name),
      });
      queryClient.invalidateQueries({
        queryKey: httpProxyKeys.lists(),
      });
    },
    ...options,
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
