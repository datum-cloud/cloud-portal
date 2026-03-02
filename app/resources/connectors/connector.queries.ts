import type { Connector } from './connector.schema';
import { createConnectorService, connectorKeys } from './connector.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

export function useConnectors(
  projectId: string,
  options?: Omit<UseQueryOptions<Connector[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: connectorKeys.list(projectId),
    queryFn: () => createConnectorService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useDeleteConnector(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createConnectorService().delete(projectId, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      await queryClient.cancelQueries({ queryKey: connectorKeys.detail(projectId, name) });
      queryClient.invalidateQueries({ queryKey: connectorKeys.list(projectId) });

      options?.onSuccess?.(...args);
    },
  });
}

export function useHydrateConnectors(projectId: string, initialData: Connector[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(connectorKeys.list(projectId), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, initialData]);
}
