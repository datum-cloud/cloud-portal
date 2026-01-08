import type {
  Organization,
  OrganizationList,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization.schema';
import { createOrganizationService, organizationKeys } from './organization.service';
import type { PaginationParams } from '@/resources/base/base.schema';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useOrganizations(
  params?: PaginationParams,
  options?: Omit<UseQueryOptions<OrganizationList>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: organizationKeys.list(params),
    queryFn: () => createOrganizationService().list(params),
    ...options,
  });
}

export function useOrganizationsInfinite(params?: { limit?: number }) {
  return useInfiniteQuery({
    queryKey: organizationKeys.lists(),
    queryFn: ({ pageParam }) =>
      createOrganizationService().list({ cursor: pageParam, limit: params?.limit ?? 1000 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  });
}

export function useOrganization(
  name: string,
  options?: Omit<UseQueryOptions<Organization>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: organizationKeys.detail(name),
    queryFn: () => createOrganizationService().get(name),
    enabled: !!name,
    ...options,
  });
}

export function useCreateOrganization(
  options?: UseMutationOptions<Organization, Error, CreateOrganizationInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrganizationInput) => createOrganizationService().create(input),
    ...options,
    onSuccess: (...args) => {
      const [newOrg] = args;
      // Set detail cache + invalidate list (no Watch for this resource)
      queryClient.setQueryData(organizationKeys.detail(newOrg.name), newOrg);
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateOrganization(
  name: string,
  options?: UseMutationOptions<Organization, Error, UpdateOrganizationInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) => createOrganizationService().update(name, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      // Update detail cache + invalidate list (no Watch for this resource)
      queryClient.setQueryData(organizationKeys.detail(name), data);
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteOrganization(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createOrganizationService().delete(name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      // Cancel in-flight queries + invalidate list (no Watch for this resource)
      await queryClient.cancelQueries({ queryKey: organizationKeys.detail(name) });
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}
