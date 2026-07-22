import { createOrganizationGatewayService } from './organization.gateway';
import { createOrganizationGqlService, organizationKeys } from './organization.gql-service';
import type {
  Organization,
  OrganizationList,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization.schema';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';

const organizationsListQueryKey = [...organizationKeys.lists(), 'gateway'] as const;

/**
 * Hook to fetch the organizations list via the gateway GraphQL API.
 *
 * Uses the user's membership list for org rows, then batch-fetches member
 * avatars via the gateway `organizationMembers` query.
 */
export function useOrganizationsGql(_params?: undefined, options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: organizationsListQueryKey,
    queryFn: () => createOrganizationGatewayService().listAll(),
    enabled: options?.enabled !== false,
    staleTime: QUERY_STALE_TIME,
  });

  return {
    data: query.data as OrganizationList | undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to create an organization via GraphQL.
 * Uses TanStack Query mutation; invalidates the list cache on success.
 */
export function useCreateOrganizationGql(
  options?: UseMutationOptions<Organization, Error, CreateOrganizationInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrganizationInput) => createOrganizationGqlService().create(input),
    ...options,
    onSuccess: (...args) => {
      const [newOrg] = args;
      queryClient.setQueryData(organizationKeys.detail(newOrg.name), newOrg);
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

/**
 * Hook to update an organization via GraphQL.
 * Uses TanStack Query mutation; updates the detail cache and invalidates the
 * list cache on success.
 */
export function useUpdateOrganizationGql(
  name: string,
  options?: UseMutationOptions<Organization, Error, UpdateOrganizationInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) =>
      createOrganizationGqlService().update(name, input),
    ...options,
    onSuccess: (...args) => {
      const [updatedOrg] = args;
      queryClient.setQueryData(organizationKeys.detail(name), updatedOrg);
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

/**
 * Hook to delete an organization via GraphQL.
 * Uses TanStack Query mutation; cancels any in-flight detail query and
 * invalidates the list cache on success.
 */
export function useDeleteOrganizationGql(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createOrganizationGqlService().delete(name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      await queryClient.cancelQueries({ queryKey: organizationKeys.detail(name) });
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}
