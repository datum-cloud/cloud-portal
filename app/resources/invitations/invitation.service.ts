import {
  toInvitation,
  toInvitationList,
  toCreateInvitationPayload,
  toUpdateInvitationStatePayload,
} from './invitation.adapter';
import type { Invitation, CreateInvitationInput } from './invitation.schema';
import {
  listIamMiloapisComV1Alpha1NamespacedUserInvitation,
  listIamMiloapisComV1Alpha1UserInvitationForAllNamespaces,
  createIamMiloapisComV1Alpha1NamespacedUserInvitation,
  deleteIamMiloapisComV1Alpha1NamespacedUserInvitation,
  readIamMiloapisComV1Alpha1NamespacedUserInvitation,
  patchIamMiloapisComV1Alpha1NamespacedUserInvitation,
  type ComMiloapisIamV1Alpha1UserInvitationList,
  type ComMiloapisIamV1Alpha1UserInvitation,
} from '@/modules/control-plane/iam';
import { logger } from '@/modules/logger';
import type { ServiceOptions } from '@/resources/base/types';
import { getOrgScopedBase, getUserScopedBase } from '@/resources/base/utils';
import { buildOrganizationNamespace } from '@/utils/common';
import { mapApiError } from '@/utils/errors/error-mapper';

export const invitationKeys = {
  all: ['invitations'] as const,
  lists: () => [...invitationKeys.all, 'list'] as const,
  list: (organizationId: string) => [...invitationKeys.lists(), organizationId] as const,
  userLists: () => [...invitationKeys.all, 'user-list'] as const,
  userList: (userId: string) => [...invitationKeys.userLists(), userId] as const,
  details: () => [...invitationKeys.all, 'detail'] as const,
  detail: (organizationId: string, name: string) =>
    [...invitationKeys.details(), organizationId, name] as const,
};

const SERVICE_NAME = 'InvitationService';

export function createInvitationService() {
  return {
    /**
     * List all pending invitations in an organization
     */
    async list(organizationId: string, _options?: ServiceOptions): Promise<Invitation[]> {
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

    async fetchList(organizationId: string): Promise<Invitation[]> {
      const response = await listIamMiloapisComV1Alpha1NamespacedUserInvitation({
        baseURL: getOrgScopedBase(organizationId),
        path: {
          namespace: buildOrganizationNamespace(organizationId),
        },
      });

      const data = response.data as ComMiloapisIamV1Alpha1UserInvitationList;

      // Filter only pending invitations
      const filteredItems = (data?.items ?? []).filter(
        (invitation) => invitation.spec?.state === 'Pending'
      );

      return toInvitationList(filteredItems).items;
    },

    /**
     * Get user's pending invitations across all organizations
     */
    async userInvitations(userId: string, _options?: ServiceOptions): Promise<Invitation[]> {
      const startTime = Date.now();

      try {
        const result = await this.fetchUserInvitations(userId);

        logger.service(SERVICE_NAME, 'userInvitations', {
          input: { userId },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.userInvitations failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchUserInvitations(_userId: string): Promise<Invitation[]> {
      const response = await listIamMiloapisComV1Alpha1UserInvitationForAllNamespaces({
        baseURL: getUserScopedBase(),
      });

      const data = response.data as ComMiloapisIamV1Alpha1UserInvitationList;

      // Filter only pending invitations
      const filteredItems = (data?.items ?? []).filter(
        (invitation) => invitation.spec?.state === 'Pending'
      );

      return toInvitationList(filteredItems).items;
    },

    /**
     * Get a single invitation by ID
     */
    async get(organizationId: string, invitationId: string): Promise<Invitation> {
      const startTime = Date.now();

      try {
        const response = await readIamMiloapisComV1Alpha1NamespacedUserInvitation({
          baseURL: getOrgScopedBase(organizationId),
          path: {
            namespace: buildOrganizationNamespace(organizationId),
            name: invitationId,
          },
        });

        const data = response.data as ComMiloapisIamV1Alpha1UserInvitation;
        const invitation = toInvitation(data);

        logger.service(SERVICE_NAME, 'get', {
          input: { organizationId, invitationId },
          duration: Date.now() - startTime,
        });

        return invitation;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Create a new invitation
     */
    async create(
      organizationId: string,
      input: CreateInvitationInput,
      options?: ServiceOptions
    ): Promise<Invitation | ComMiloapisIamV1Alpha1UserInvitation> {
      const startTime = Date.now();

      try {
        const payload = toCreateInvitationPayload(organizationId, input);

        const response = await createIamMiloapisComV1Alpha1NamespacedUserInvitation({
          baseURL: getOrgScopedBase(organizationId),
          path: {
            namespace: buildOrganizationNamespace(organizationId),
          },
          query: {
            dryRun: options?.dryRun ? 'All' : undefined,
          },
          body: payload,
        });

        const data = response.data as ComMiloapisIamV1Alpha1UserInvitation;

        // Return raw response for dryRun
        if (options?.dryRun) {
          return data;
        }

        const invitation = toInvitation(data);

        logger.service(SERVICE_NAME, 'create', {
          input: { organizationId, email: input.email },
          duration: Date.now() - startTime,
        });

        return invitation;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Delete an invitation
     */
    async delete(organizationId: string, invitationId: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteIamMiloapisComV1Alpha1NamespacedUserInvitation({
          baseURL: getOrgScopedBase(organizationId),
          path: {
            namespace: buildOrganizationNamespace(organizationId),
            name: invitationId,
          },
        });

        logger.service(SERVICE_NAME, 'delete', {
          input: { organizationId, invitationId },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Update invitation state (accept/decline)
     */
    async updateState(
      organizationId: string,
      invitationId: string,
      state: 'Accepted' | 'Declined'
    ): Promise<Invitation> {
      const startTime = Date.now();

      try {
        const payload = toUpdateInvitationStatePayload(state);

        const response = await patchIamMiloapisComV1Alpha1NamespacedUserInvitation({
          baseURL: getOrgScopedBase(organizationId),
          path: {
            namespace: buildOrganizationNamespace(organizationId),
            name: invitationId,
          },
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
          query: {
            fieldManager: 'datum-cloud-portal',
          },
          body: payload,
        });

        const data = response.data as ComMiloapisIamV1Alpha1UserInvitation;
        const invitation = toInvitation(data);

        logger.service(SERVICE_NAME, 'updateState', {
          input: { organizationId, invitationId, state },
          duration: Date.now() - startTime,
        });

        return invitation;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.updateState failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type InvitationService = ReturnType<typeof createInvitationService>;
