import {
  toOrganization,
  toOrganizationFromMembership,
  toCreatePayload,
  toUpdatePayload,
} from './organization.adapter';
import {
  createOrganizationSchema,
  type Organization,
  type OrganizationList,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from './organization.schema';
import {
  listResourcemanagerMiloapisComV1Alpha1OrganizationMembershipForAllNamespaces,
  readResourcemanagerMiloapisComV1Alpha1Organization,
  createResourcemanagerMiloapisComV1Alpha1Organization,
  patchResourcemanagerMiloapisComV1Alpha1Organization,
  deleteResourcemanagerMiloapisComV1Alpha1Organization,
} from '@/modules/control-plane/resource-manager';
import { logger } from '@/modules/logger';
import type { PaginationParams } from '@/resources/base/base.schema';
import type { ServiceOptions } from '@/resources/base/types';
import { getUserScopedBase } from '@/resources/base/utils';
import { parseOrThrow } from '@/utils/errors/error-formatter';
import { mapApiError } from '@/utils/errors/error-mapper';

// Query Keys (for React Query)
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...organizationKeys.lists(), params] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (name: string) => [...organizationKeys.details(), name] as const,
};

const SERVICE_NAME = 'OrganizationService';

export function createOrganizationService() {
  return {
    async list(params?: PaginationParams, _options?: ServiceOptions): Promise<OrganizationList> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(params);

        logger.service(SERVICE_NAME, 'list', {
          input: params,
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchList(params?: PaginationParams): Promise<OrganizationList> {
      const response =
        await listResourcemanagerMiloapisComV1Alpha1OrganizationMembershipForAllNamespaces({
          baseURL: getUserScopedBase(),
          query: {
            limit: params?.limit ?? 1000,
            continue: params?.cursor,
          },
        });

      const data = response.data;

      if (!data?.items) {
        return { items: [], nextCursor: null, hasMore: false };
      }

      // Transform memberships to organizations, filter by status, and sort
      // Note: org.status is already mapped to 'Active', 'Pending', etc. by the adapter
      const items = data.items
        .map(toOrganizationFromMembership)
        .filter((org) => org.status === 'Active')
        .sort((a, b) => {
          // Personal organizations first
          if (a.type === 'Personal' && b.type !== 'Personal') return -1;
          if (b.type === 'Personal' && a.type !== 'Personal') return 1;
          // Then alphabetically by displayName
          const aName = a.displayName ?? a.name ?? '';
          const bName = b.displayName ?? b.name ?? '';
          return aName.localeCompare(bName);
        });

      return {
        items,
        nextCursor: data.metadata?.continue ?? null,
        hasMore: !!data.metadata?.continue,
      };
    },

    async get(name: string, _options?: ServiceOptions): Promise<Organization> {
      const startTime = Date.now();

      try {
        const result = await this.fetchOne(name);

        logger.service(SERVICE_NAME, 'get', {
          input: { name },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchOne(name: string): Promise<Organization> {
      const response = await readResourcemanagerMiloapisComV1Alpha1Organization({
        baseURL: getUserScopedBase(),
        path: { name },
      });

      if (!response.data) {
        throw new Error(`Organization ${name} not found`);
      }

      return toOrganization(response.data);
    },

    async create(input: CreateOrganizationInput, options?: ServiceOptions): Promise<Organization> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(createOrganizationSchema, input, {
          message: 'Invalid organization data',
        });

        const payload = toCreatePayload(validated);

        const response = await createResourcemanagerMiloapisComV1Alpha1Organization({
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
        });

        if (!response.data) {
          throw new Error('Failed to create organization');
        }

        const org = toOrganization(response.data);

        logger.service(SERVICE_NAME, 'create', {
          input: { name: input.name, type: input.type },
          duration: Date.now() - startTime,
        });

        return org;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async update(
      name: string,
      input: UpdateOrganizationInput,
      options?: ServiceOptions
    ): Promise<Organization> {
      const startTime = Date.now();

      try {
        const payload = toUpdatePayload(input);

        const response = await patchResourcemanagerMiloapisComV1Alpha1Organization({
          path: { name },
          body: payload as any, // JSON Patch array
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
          headers: { 'Content-Type': 'application/json-patch+json' },
        });

        if (!response.data) {
          throw new Error('Failed to update organization');
        }

        const org = toOrganization(response.data);

        logger.service(SERVICE_NAME, 'update', {
          input: { name },
          duration: Date.now() - startTime,
        });

        return org;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async delete(name: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteResourcemanagerMiloapisComV1Alpha1Organization({
          path: { name },
        });

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

export type OrganizationService = ReturnType<typeof createOrganizationService>;
