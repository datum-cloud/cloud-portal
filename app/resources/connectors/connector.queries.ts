import type { Connector } from './connector.schema';
import { CONNECTOR_SYNC_KIND, createConnectorService, connectorKeys } from './connector.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import {
  defineResourceMutations,
  withResourceHandlers,
} from '@/modules/watch/define-resource-mutations';
import { useQuery, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';

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

export function useConnector(
  projectId: string,
  name: string | undefined,
  options?: Omit<UseQueryOptions<Connector>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: connectorKeys.detail(projectId, name ?? ''),
    queryFn: () => createConnectorService().get(projectId, name!),
    enabled: !!projectId && !!name,
    ...options,
  });
}

/** Connectors are watched: mutations write the list and never invalidate it. */
export function connectorMutations(projectId: string) {
  return defineResourceMutations<Connector>({
    kind: CONNECTOR_SYNC_KIND,
    scope: projectId,
    keys: {
      lists: connectorKeys.list(projectId),
      detail: (name) => connectorKeys.detail(projectId, name),
    },
    getName: (connector) => connector.name,
    getMeta: (connector) => ({
      name: connector.name,
      resourceVersion: connector.resourceVersion,
    }),
    watched: true,
  });
}

export function useDeleteConnector(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (name: string) => createConnectorService().delete(projectId, name),
    ...withResourceHandlers(
      connectorMutations(projectId).remove<string>((name) => name),
      options
    ),
  });
}
