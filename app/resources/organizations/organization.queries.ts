import type {
  Organization,
  OrganizationList,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization.schema';
import { createOrganizationService, organizationKeys } from './organization.service';
import { useServiceContext } from '@/providers/service.provider';
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
  const ctx = useServiceContext();
  const service = createOrganizationService(ctx);

  return useQuery({
    queryKey: organizationKeys.list(params),
    queryFn: () => service.list(params),
    ...options,
  });
}

export function useOrganizationsInfinite(params?: { limit?: number }) {
  const ctx = useServiceContext();
  const service = createOrganizationService(ctx);

  return useInfiniteQuery({
    queryKey: organizationKeys.lists(),
    queryFn: ({ pageParam }) => service.list({ cursor: pageParam, limit: params?.limit ?? 1000 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  });
}

export function useOrganization(
  name: string,
  options?: Omit<UseQueryOptions<Organization>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createOrganizationService(ctx);

  return useQuery({
    queryKey: organizationKeys.detail(name),
    queryFn: () => service.get(name),
    enabled: !!name,
    ...options,
  });
}

export function useCreateOrganization(
  options?: UseMutationOptions<Organization, Error, CreateOrganizationInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createOrganizationService(ctx);

  return useMutation({
    mutationFn: (input: CreateOrganizationInput) => service.create(input),
    onSuccess: (newOrg) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });
      queryClient.setQueryData(organizationKeys.detail(newOrg.name), newOrg);
    },
    ...options,
  });
}

type UpdateOrganizationContext = { previous: Organization | undefined };

export function useUpdateOrganization(
  name: string,
  options?: UseMutationOptions<
    Organization,
    Error,
    UpdateOrganizationInput,
    UpdateOrganizationContext
  >
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createOrganizationService(ctx);

  return useMutation<Organization, Error, UpdateOrganizationInput, UpdateOrganizationContext>({
    mutationFn: (input: UpdateOrganizationInput) => service.update(name, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: organizationKeys.detail(name),
      });

      const previous = queryClient.getQueryData<Organization>(organizationKeys.detail(name));

      if (previous) {
        queryClient.setQueryData(organizationKeys.detail(name), {
          ...previous,
          displayName: input.displayName ?? previous.displayName,
          description: input.description ?? previous.description,
        });
      }

      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(organizationKeys.detail(name), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: organizationKeys.detail(name),
      });
      queryClient.invalidateQueries({
        queryKey: organizationKeys.lists(),
      });
    },
    ...options,
  });
}

export function useDeleteOrganization(options?: UseMutationOptions<void, Error, string>) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createOrganizationService(ctx);

  return useMutation({
    mutationFn: (name: string) => service.delete(name),
    onSuccess: (_data, name) => {
      queryClient.removeQueries({
        queryKey: organizationKeys.detail(name),
      });
      queryClient.invalidateQueries({
        queryKey: organizationKeys.lists(),
      });
    },
    ...options,
  });
}
