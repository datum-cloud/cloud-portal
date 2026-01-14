import { toGroup, toGroupList } from './group.adapter';
import {
  createGroupSchema,
  type Group,
  type CreateGroupInput,
  type UpdateGroupInput,
} from './group.schema';
import {
  listIamMiloapisComV1Alpha1NamespacedGroup,
  readIamMiloapisComV1Alpha1NamespacedGroup,
  createIamMiloapisComV1Alpha1NamespacedGroup,
  patchIamMiloapisComV1Alpha1NamespacedGroup,
  deleteIamMiloapisComV1Alpha1NamespacedGroup,
  type ComMiloapisIamV1Alpha1GroupList,
  type ComMiloapisIamV1Alpha1Group,
} from '@/modules/control-plane/iam';
import { logger } from '@/modules/logger';
import { ControlPlaneStatus } from '@/resources/base';
import type { ServiceOptions } from '@/resources/base/types';
import { buildOrganizationNamespace } from '@/utils/common';
import { parseOrThrow } from '@/utils/errors/error-formatter';
import { mapApiError } from '@/utils/errors/error-mapper';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getOrgScopedBase } from '@/utils/scoped-urls';

export const groupKeys = {
  all: ['groups'] as const,
  lists: () => [...groupKeys.all, 'list'] as const,
  list: (organizationId: string) => [...groupKeys.lists(), organizationId] as const,
  details: () => [...groupKeys.all, 'detail'] as const,
  detail: (organizationId: string, name: string) =>
    [...groupKeys.details(), organizationId, name] as const,
};

const SERVICE_NAME = 'GroupService';

export function createGroupService() {
  return {
    /**
     * List all groups in an organization
     */
    async list(organizationId: string, _options?: ServiceOptions): Promise<Group[]> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(organizationId);

        logger.service(SERVICE_NAME, 'list', {
          input: { organizationId },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchList(organizationId: string): Promise<Group[]> {
      const response = await listIamMiloapisComV1Alpha1NamespacedGroup({
        baseURL: getOrgScopedBase(organizationId),
        path: {
          namespace: buildOrganizationNamespace(organizationId),
        },
      });

      const data = response.data as ComMiloapisIamV1Alpha1GroupList;

      // Filter only successful groups
      const filteredItems = (data?.items ?? []).filter((item) => {
        const status = transformControlPlaneStatus(item.status);
        return status.status === ControlPlaneStatus.Success;
      });

      return toGroupList(filteredItems).items;
    },

    /**
     * Get a single group by name
     */
    async get(organizationId: string, name: string, _options?: ServiceOptions): Promise<Group> {
      const startTime = Date.now();

      try {
        const result = await this.fetchOne(organizationId, name);

        logger.service(SERVICE_NAME, 'get', {
          input: { organizationId, name },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchOne(organizationId: string, name: string): Promise<Group> {
      const response = await readIamMiloapisComV1Alpha1NamespacedGroup({
        baseURL: getOrgScopedBase(organizationId),
        path: {
          namespace: buildOrganizationNamespace(organizationId),
          name,
        },
      });

      const data = response.data as ComMiloapisIamV1Alpha1Group;

      if (!data) {
        throw new Error(`Group ${name} not found`);
      }

      return toGroup(data);
    },

    /**
     * Create a new group
     */
    async create(
      organizationId: string,
      input: CreateGroupInput,
      options?: ServiceOptions
    ): Promise<Group> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(createGroupSchema, input, {
          message: 'Invalid group data',
        });

        const namespace = buildOrganizationNamespace(organizationId);
        const payload: ComMiloapisIamV1Alpha1Group = {
          apiVersion: 'iam.miloapis.com/v1alpha1',
          kind: 'Group',
          metadata: {
            name: validated.name,
            namespace,
          },
        };

        const response = await createIamMiloapisComV1Alpha1NamespacedGroup({
          baseURL: getOrgScopedBase(organizationId),
          path: { namespace },
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
        });

        const data = response.data as ComMiloapisIamV1Alpha1Group;

        if (!data) {
          throw new Error('Failed to create group');
        }

        const group = toGroup(data);

        logger.service(SERVICE_NAME, 'create', {
          input: { organizationId, name: input.name },
          duration: Date.now() - startTime,
        });

        return group;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Update an existing group
     */
    async update(
      organizationId: string,
      name: string,
      input: UpdateGroupInput,
      options?: ServiceOptions
    ): Promise<Group> {
      const startTime = Date.now();

      try {
        const namespace = buildOrganizationNamespace(organizationId);
        const payload: Partial<ComMiloapisIamV1Alpha1Group> = {
          metadata: {
            resourceVersion: input.resourceVersion,
          },
        };

        const response = await patchIamMiloapisComV1Alpha1NamespacedGroup({
          baseURL: getOrgScopedBase(organizationId),
          path: { namespace, name },
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });

        const data = response.data as ComMiloapisIamV1Alpha1Group;

        if (!data) {
          throw new Error('Failed to update group');
        }

        const group = toGroup(data);

        logger.service(SERVICE_NAME, 'update', {
          input: { organizationId, name },
          duration: Date.now() - startTime,
        });

        return group;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Delete a group
     */
    async delete(organizationId: string, name: string): Promise<void> {
      const startTime = Date.now();

      try {
        const namespace = buildOrganizationNamespace(organizationId);

        await deleteIamMiloapisComV1Alpha1NamespacedGroup({
          baseURL: getOrgScopedBase(organizationId),
          path: { namespace, name },
        });

        logger.service(SERVICE_NAME, 'delete', {
          input: { organizationId, name },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type GroupService = ReturnType<typeof createGroupService>;
