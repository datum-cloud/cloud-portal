import type {
  Organization,
  OrganizationEmailDomainJoining,
  OrganizationList,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization.schema';
import { createOrganizationService, organizationKeys } from './organization.service';
import type { OrganizationContactInfoPatchPayload } from '@/features/onboarding/schemas/org-contact-info-schema';
import type { PaginationParams } from '@/resources/base/base.schema';
import { UNWATCHED_LIST_QUERY_OPTIONS } from '@/utils/config/query.config';
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
    ...UNWATCHED_LIST_QUERY_OPTIONS,
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
      void queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });

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
      void queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}

/** Variables for `useUpdateOrganizationContactInfo`. */
export interface UpdateOrganizationContactInfoVariables {
  contactInfo: OrganizationContactInfoPatchPayload;
  /** Optional new display name; omit to leave the org's display name untouched. */
  displayName?: string;
}

export function useUpdateOrganizationContactInfo(
  name: string,
  options?: UseMutationOptions<Organization, Error, UpdateOrganizationContactInfoVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateOrganizationContactInfoVariables) =>
      createOrganizationService().updateContactInfo(name, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      queryClient.setQueryData(organizationKeys.detail(name), data);
      void queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}

/** Sets or (with null) removes the organization's email domain joining. */
export function useUpdateOrganizationEmailDomainJoining(
  name: string,
  options?: UseMutationOptions<Organization, Error, OrganizationEmailDomainJoining | null>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (joining: OrganizationEmailDomainJoining | null) =>
      createOrganizationService().updateEmailDomainJoining(name, joining),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      queryClient.setQueryData(organizationKeys.detail(name), data);

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
      void queryClient.invalidateQueries({ queryKey: organizationKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}
