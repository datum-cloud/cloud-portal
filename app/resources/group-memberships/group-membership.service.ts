import { toGroupMembership, toGroupMembershipList } from './group-membership.adapter';
import type { GroupMembership } from './group-membership.schema';
import {
  createIamMiloapisComV1Alpha1NamespacedGroupMembership,
  deleteIamMiloapisComV1Alpha1NamespacedGroupMembership,
  listIamMiloapisComV1Alpha1NamespacedGroupMembership,
  type ComMiloapisIamV1Alpha1GroupMembershipList,
} from '@/modules/control-plane/iam';
import { logger } from '@/modules/logger';
import type { ServiceOptions } from '@/resources/base/types';
import { getOrgScopedBase } from '@/resources/base/utils';
import { buildOrganizationNamespace } from '@/utils/common';
import { mapApiError } from '@/utils/errors/error-mapper';

export type CreateGroupMembershipInput = {
  groupName: string;
  groupNamespace: string;
  userRefName: string;
};

export const groupMembershipKeys = {
  all: ['group-memberships'] as const,
  lists: () => [...groupMembershipKeys.all, 'list'] as const,
  list: (organizationId: string) => [...groupMembershipKeys.lists(), organizationId] as const,
};

const SERVICE_NAME = 'GroupMembershipService';

export function createGroupMembershipService() {
  return {
    /**
     * List all group memberships in an organization
     */
    async list(organizationId: string, _options?: ServiceOptions): Promise<GroupMembership[]> {
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

    async create(
      organizationId: string,
      input: CreateGroupMembershipInput
    ): Promise<GroupMembership> {
      const namespace = buildOrganizationNamespace(organizationId);
      try {
        const response = await createIamMiloapisComV1Alpha1NamespacedGroupMembership({
          baseURL: getOrgScopedBase(organizationId),
          path: { namespace },
          body: {
            apiVersion: 'iam.miloapis.com/v1alpha1',
            kind: 'GroupMembership',
            metadata: { generateName: 'gm-', namespace },
            spec: {
              groupRef: { name: input.groupName, namespace: input.groupNamespace },
              userRef: { name: input.userRefName },
            },
          },
        });
        return toGroupMembership(response.data as Parameters<typeof toGroupMembership>[0]);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async delete(organizationId: string, membershipName: string): Promise<void> {
      const namespace = buildOrganizationNamespace(organizationId);
      try {
        await deleteIamMiloapisComV1Alpha1NamespacedGroupMembership({
          baseURL: getOrgScopedBase(organizationId),
          path: { namespace, name: membershipName },
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchList(organizationId: string): Promise<GroupMembership[]> {
      const response = await listIamMiloapisComV1Alpha1NamespacedGroupMembership({
        baseURL: getOrgScopedBase(organizationId),
        path: {
          namespace: buildOrganizationNamespace(organizationId),
        },
      });

      const data = response.data as ComMiloapisIamV1Alpha1GroupMembershipList;

      return toGroupMembershipList(data?.items ?? []).items;
    },
  };
}

export type GroupMembershipService = ReturnType<typeof createGroupMembershipService>;
