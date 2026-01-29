import { toOrganization, toOrganizationFromMembership } from './organization.adapter';
import type {
  Organization,
  OrganizationList,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './organization.schema';
import { organizationKeys } from './organization.service';
import type {
  ComMiloapisResourcemanagerV1Alpha1Organization,
  ComMiloapisResourcemanagerV1Alpha1OrganizationMembership,
} from '@/modules/control-plane/resource-manager';
import { createGqlClient } from '@/modules/gqlts/client';
import type {
  QueryRequest,
  MutationRequest,
  com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipListRequest,
  com_miloapis_resourcemanager_v1alpha1_OrganizationRequest,
} from '@/modules/gqlts/generated';
import { logger } from '@/modules/logger';
import type { PaginationParams } from '@/resources/base/base.schema';
import { mapApiError } from '@/utils/errors/error-mapper';

const SERVICE_NAME = 'OrganizationGqlService';

// ============================================================================
// Type-safe field selections
// ============================================================================
/**
 * Field selection for single organization query/mutation responses.
 */
const organizationSelection = {
  metadata: {
    uid: true,
    name: true,
    namespace: true,
    creationTimestamp: true,
    resourceVersion: true,
    annotations: true,
  },
  spec: { type: true },
  status: { conditions: { type: true, status: true, reason: true } },
} satisfies com_miloapis_resourcemanager_v1alpha1_OrganizationRequest;

// ============================================================================
// Service implementation
// ============================================================================

/**
 * GraphQL service for organizations.
 * Uses Gqlts with typed client for GraphQL operations.
 */
export function createOrganizationGqlService() {
  return {
    async list(params?: PaginationParams): Promise<OrganizationList> {
      const startTime = Date.now();

      try {
        // Use user scope like REST API - 'me' gets resolved by the API
        const client = createGqlClient({ type: 'user', userId: 'me' });

        const query = {
          listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces: [
            {}, // variables
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
        } satisfies QueryRequest;

        const result = await client.query(query);

        const data =
          result.data?.listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces;

        if (!data?.items) {
          return { items: [], nextCursor: null, hasMore: false };
        }

        // Transform using existing adapter, filter and sort
        const items = data.items
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .map((item) =>
            toOrganizationFromMembership(
              item as unknown as ComMiloapisResourcemanagerV1Alpha1OrganizationMembership
            )
          )
          .filter((org: Organization) => org.status === 'Active')
          .sort((a: Organization, b: Organization) => {
            if (a.type === 'Personal' && b.type !== 'Personal') return -1;
            if (b.type === 'Personal' && a.type !== 'Personal') return 1;
            const aName = a.displayName ?? a.name ?? '';
            const bName = b.displayName ?? b.name ?? '';
            return aName.localeCompare(bName);
          });

        logger.service(SERVICE_NAME, 'list', {
          input: params,
          duration: Date.now() - startTime,
        });

        return {
          items,
          nextCursor: data.metadata?.continue ?? null,
          hasMore: !!data.metadata?.continue,
        };
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async get(name: string): Promise<Organization> {
      const startTime = Date.now();

      try {
        const client = createGqlClient({ type: 'org', orgId: name });

        const query = {
          readResourcemanagerMiloapisComV1alpha1Organization: [{ name }, organizationSelection],
        } satisfies QueryRequest;

        const result = await client.query(query);

        const data = result.data?.readResourcemanagerMiloapisComV1alpha1Organization;

        if (!data) {
          throw new Error(`Organization ${name} not found`);
        }

        logger.service(SERVICE_NAME, 'get', {
          input: { name },
          duration: Date.now() - startTime,
        });

        return toOrganization(data as unknown as ComMiloapisResourcemanagerV1Alpha1Organization);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async create(input: CreateOrganizationInput): Promise<Organization> {
      const startTime = Date.now();

      try {
        const client = createGqlClient({ type: 'global' });

        const mutation = {
          createResourcemanagerMiloapisComV1alpha1Organization: [
            {
              input: {
                metadata: {
                  name: input.name,
                  annotations: {
                    'kubernetes.io/display-name': input.displayName,
                    ...(input.description && { 'kubernetes.io/description': input.description }),
                  },
                },
                spec: { type: input.type },
              },
            },
            organizationSelection,
          ],
        } satisfies MutationRequest;

        const result = await client.mutation(mutation);

        const data = result.data?.createResourcemanagerMiloapisComV1alpha1Organization;

        if (!data) {
          throw new Error('Failed to create organization');
        }

        logger.service(SERVICE_NAME, 'create', {
          input: { name: input.name, type: input.type },
          duration: Date.now() - startTime,
        });

        return toOrganization(data as unknown as ComMiloapisResourcemanagerV1Alpha1Organization);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async update(name: string, input: UpdateOrganizationInput): Promise<Organization> {
      const startTime = Date.now();

      try {
        const client = createGqlClient({ type: 'org', orgId: name });

        const mutation = {
          patchResourcemanagerMiloapisComV1alpha1Organization: [
            {
              name,
              input: {
                metadata: {
                  annotations: {
                    ...(input.displayName && { 'kubernetes.io/display-name': input.displayName }),
                    ...(input.description && { 'kubernetes.io/description': input.description }),
                  },
                },
              },
            },
            organizationSelection,
          ],
        } satisfies MutationRequest;

        const result = await client.mutation(mutation);

        const data = result.data?.patchResourcemanagerMiloapisComV1alpha1Organization;

        if (!data) {
          throw new Error('Failed to update organization');
        }

        logger.service(SERVICE_NAME, 'update', {
          input: { name },
          duration: Date.now() - startTime,
        });

        return toOrganization(data as unknown as ComMiloapisResourcemanagerV1Alpha1Organization);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async delete(name: string): Promise<void> {
      const startTime = Date.now();

      try {
        const client = createGqlClient({ type: 'org', orgId: name });

        const mutation = {
          deleteResourcemanagerMiloapisComV1alpha1Organization: [{ name }, { status: true }],
        } satisfies MutationRequest;

        await client.mutation(mutation);

        logger.service(SERVICE_NAME, 'delete', {
          input: { name },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

// Re-export query keys for shared cache
export { organizationKeys };

export type OrganizationGqlService = ReturnType<typeof createOrganizationGqlService>;
