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
import { runGqlMutation, runGqlQuery } from '@/modules/graphql/client';
import type {
  com_miloapis_resourcemanager_v1alpha1_OrganizationMembershipListRequest,
  com_miloapis_resourcemanager_v1alpha1_OrganizationRequest,
} from '@/modules/graphql/generated';
import { logger } from '@/modules/logger';
import type { PaginationParams } from '@/resources/base/base.schema';
import { NotFoundError } from '@/utils/errors';
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
 * Uses the named runGqlQuery / runGqlMutation helpers for GraphQL operations.
 */
export function createOrganizationGqlService() {
  return {
    async list(params?: PaginationParams): Promise<OrganizationList> {
      const startTime = Date.now();

      try {
        // Use user scope like REST API - 'me' gets resolved by the API
        const result = await runGqlQuery(
          'OrganizationMemberships',
          {
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
          },
          { type: 'user', userId: 'me' }
        );

        const data =
          result?.listResourcemanagerMiloapisComV1alpha1OrganizationMembershipForAllNamespaces;

        if (!data?.items) {
          return { items: [], nextCursor: null, hasMore: false };
        }

        // Transform using existing adapter, filter and sort
        const items = (
          data.items as (ComMiloapisResourcemanagerV1Alpha1OrganizationMembership | null)[]
        )
          .filter(
            (item): item is ComMiloapisResourcemanagerV1Alpha1OrganizationMembership =>
              item !== null
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
        const result = await runGqlQuery(
          'Organization',
          {
            readResourcemanagerMiloapisComV1alpha1Organization: [{ name }, organizationSelection],
          },
          { type: 'org', orgId: name }
        );

        const data = result?.readResourcemanagerMiloapisComV1alpha1Organization;

        if (!data) {
          throw new NotFoundError('Organization', name);
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
        const result = await runGqlMutation(
          'OrganizationCreate',
          {
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
          },
          { type: 'global' }
        );

        const data = result?.createResourcemanagerMiloapisComV1alpha1Organization;

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
        const result = await runGqlMutation(
          'OrganizationUpdate',
          {
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
          },
          { type: 'org', orgId: name }
        );

        const data = result?.patchResourcemanagerMiloapisComV1alpha1Organization;

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
        await runGqlMutation(
          'OrganizationDelete',
          {
            deleteResourcemanagerMiloapisComV1alpha1Organization: [{ name }, { status: true }],
          },
          { type: 'org', orgId: name }
        );

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
