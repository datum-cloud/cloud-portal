import { toOrganizationFromMembership } from './organization.adapter';
import { createOrganizationGqlService, organizationKeys } from './organization.gql-service';
import type {
  Organization,
  OrganizationList,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization.schema';
import type { ComMiloapisResourcemanagerV1Alpha1OrganizationMembership } from '@/modules/control-plane/resource-manager';
import { generateQueryOp } from '@/modules/graphql/generated';
import type { com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipListRequest } from '@/modules/graphql/generated';
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useQuery } from 'urql';

// Module-level constant — computed once, not per render.
const orgListOp = generateQueryOp({
  listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces: [
    {},
    {
      items: {
        metadata: {
          uid: true,
          name: true,
          namespace: true,
          creationTimestamp: true,
          resourceVersion: true,
          labels: true,
          annotations: true,
        },
        spec: {
          organizationRef: { name: true },
          roles: { name: true, namespace: true },
          userRef: { name: true },
        },
        status: {
          organization: { displayName: true, type: true },
          conditions: { reason: true, status: true, type: true },
        },
      },
      metadata: { continue: true, remainingItemCount: true },
    } satisfies com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipListRequest,
  ],
});

/**
 * Hook to fetch the organizations list via GraphQL using URQL.
 *
 * Uses a module-level operation constant so the query string is identical to
 * the SSR loader, guaranteeing a cache hit on the first CSR render.
 *
 * Accepts an optional `options.enabled` boolean (default true) that maps to
 * URQL's `pause` — preserving the same call-site API as the previous
 * TanStack Query version used by existing callers.
 */
export function useOrganizationsGql(_params?: undefined, options?: { enabled?: boolean }) {
  const pause = options?.enabled === false;

  const [result, reexecute] = useQuery({
    query: orgListOp.query,
    variables: orgListOp.variables,
    requestPolicy: 'cache-and-network',
    pause,
  });

  const data = useMemo<OrganizationList | undefined>(() => {
    const raw =
      result.data?.listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces;

    if (!raw?.items) return undefined;

    const items = (raw.items as (ComMiloapisResourcemanagerV1Alpha1OrganizationMembership | null)[])
      .filter(
        (item): item is ComMiloapisResourcemanagerV1Alpha1OrganizationMembership => item !== null
      )
      .map((item) => toOrganizationFromMembership(item))
      .filter((org: Organization) => org.status === 'Active')
      .sort((a: Organization, b: Organization) => {
        if (a.type === 'Personal' && b.type !== 'Personal') return -1;
        if (b.type === 'Personal' && a.type !== 'Personal') return 1;
        const aName = a.displayName ?? a.name ?? '';
        const bName = b.displayName ?? b.name ?? '';
        return aName.localeCompare(bName);
      });

    return {
      items,
      nextCursor: raw.metadata?.continue ?? null,
      hasMore: !!raw.metadata?.continue,
    };
  }, [result.data]);

  return {
    data,
    isLoading: result.fetching,
    error: result.error,
    refetch: () => reexecute({ requestPolicy: 'network-only' }),
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
