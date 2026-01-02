import { toMember, toMemberList, toUpdateMemberRolePayload } from './member.adapter';
import type { Member, UpdateMemberRoleInput } from './member.schema';
import {
  listResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership,
  deleteResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership,
  patchResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership,
  type ComMiloapisResourcemanagerV1Alpha1OrganizationMembershipList,
  type ComMiloapisResourcemanagerV1Alpha1OrganizationMembership,
} from '@/modules/control-plane/resource-manager';
import { logger } from '@/modules/logger';
import type { ServiceContext, ServiceOptions } from '@/resources/base/types';
import { buildNamespace } from '@/utils/common';
import { mapApiError } from '@/utils/errors/error-mapper';

export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (organizationId: string) => [...memberKeys.lists(), organizationId] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (organizationId: string, name: string) =>
    [...memberKeys.details(), organizationId, name] as const,
};

const SERVICE_NAME = 'MemberService';

export function createMemberService(ctx: ServiceContext) {
  const client = ctx.controlPlaneClient;

  const buildBaseUrl = (organizationId: string) =>
    `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${organizationId}/control-plane`;

  return {
    /**
     * List all members in an organization
     */
    async list(organizationId: string, _options?: ServiceOptions): Promise<Member[]> {
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
        throw mapApiError(error, ctx.requestId);
      }
    },

    async fetchList(organizationId: string): Promise<Member[]> {
      const response = await listResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership(
        {
          client,
          baseURL: buildBaseUrl(organizationId),
          path: {
            namespace: buildNamespace('organization', organizationId),
          },
        }
      );

      const data = response.data as ComMiloapisResourcemanagerV1Alpha1OrganizationMembershipList;
      return toMemberList(data?.items ?? []).items;
    },

    /**
     * Delete a member from an organization
     */
    async delete(organizationId: string, memberId: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership({
          client,
          baseURL: buildBaseUrl(organizationId),
          path: {
            namespace: buildNamespace('organization', organizationId),
            name: memberId,
          },
        });

        logger.service(SERVICE_NAME, 'delete', {
          input: { organizationId, memberId },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    /**
     * Update a member's role
     */
    async updateRole(
      organizationId: string,
      memberId: string,
      input: UpdateMemberRoleInput,
      options?: ServiceOptions
    ): Promise<Member> {
      const startTime = Date.now();

      try {
        const payload = toUpdateMemberRolePayload(memberId, input);

        const response =
          await patchResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership({
            client,
            baseURL: buildBaseUrl(organizationId),
            path: {
              namespace: buildNamespace('organization', organizationId),
              name: memberId,
            },
            query: {
              dryRun: options?.dryRun ? 'All' : undefined,
              fieldManager: 'datum-cloud-portal',
            },
            headers: {
              'Content-Type': 'application/merge-patch+json',
            },
            body: payload,
          });

        const data = response.data as ComMiloapisResourcemanagerV1Alpha1OrganizationMembership;
        const member = toMember(data);

        logger.service(SERVICE_NAME, 'updateRole', {
          input: { organizationId, memberId, role: input.role },
          duration: Date.now() - startTime,
        });

        return member;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.updateRole failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },
  };
}

export type MemberService = ReturnType<typeof createMemberService>;
