import { createOrganizationGqlService, organizationKeys } from './organization.gql-service';
import type {
  Organization,
  OrganizationList,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization.schema';
import type { PaginationParams } from '@/resources/base/base.schema';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

/**
 * Hook to fetch organizations list via GraphQL.
 * Uses shared cache key with REST for seamless switching.
 */
export function useOrganizationsGql(
  params?: PaginationParams,
  options?: Omit<UseQueryOptions<OrganizationList>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: organizationKeys.list(params),
    queryFn: () => createOrganizationGqlService().list(params),
    ...options,
  });
}

/**
 * Hook for infinite scroll organizations list via GraphQL.
 */
export function useOrganizationsInfiniteGql(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: organizationKeys.lists(),
    queryFn: ({ pageParam }) =>
      createOrganizationGqlService().list({ cursor: pageParam, limit: params?.limit ?? 1000 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  });
}

/**
 * Hook to fetch a single organization via GraphQL.
 */
export function useOrganizationGql(
  name: string,
  options?: Omit<UseQueryOptions<Organization>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: organizationKeys.detail(name),
    queryFn: () => createOrganizationGqlService().get(name),
    enabled: !!name,
    ...options,
  });
}

/**
 * Hook to create an organization via GraphQL.
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
      const [data] = args;
      queryClient.setQueryData(organizationKeys.detail(name), data);
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      options?.onSuccess?.(...args);
    },
  });
}

/**
 * Hook to delete an organization via GraphQL.
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
