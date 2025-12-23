import {
  ComMiloapisResourcemanagerV1Alpha1OrganizationMembership,
  ComMiloapisResourcemanagerV1Alpha1OrganizationMembershipList,
  deleteResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership,
  listResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership,
  patchResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership,
} from '@/modules/control-plane/resource-manager';
import { IMemberControlResponse } from '@/resources/interfaces/member.interface';
import { MemberUpdateRoleSchema } from '@/resources/schemas/member.schema';
import { buildNamespace } from '@/utils/common';
import { Client } from '@hey-api/client-axios';

export const createMembersControl = (client: Client) => {
  const buildBaseUrl = (client: Client, organizationId: string) =>
    `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${organizationId}/control-plane`;

  const transform = (
    member: ComMiloapisResourcemanagerV1Alpha1OrganizationMembership
  ): IMemberControlResponse => {
    return {
      name: member.metadata?.name ?? '',
      createdAt: member.metadata?.creationTimestamp ?? new Date(),
      uid: member.metadata?.uid ?? '',
      resourceVersion: member.metadata?.resourceVersion ?? '',
      user: {
        id: member.spec?.userRef?.name ?? '',
        ...member.status?.user,
      },
      organization: {
        id: member.spec?.organizationRef?.name ?? '',
        ...member.status?.organization,
      },
      roles: member.spec?.roles ?? [],
      status: member.status,
    };
  };

  return {
    list: async (organizationId: string) => {
      try {
        const response =
          await listResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership({
            client,
            baseURL: buildBaseUrl(client, organizationId),
            path: {
              namespace: buildNamespace('organization', organizationId),
            },
          });

        const members =
          response.data as ComMiloapisResourcemanagerV1Alpha1OrganizationMembershipList;
        return members.items?.map((item) => transform(item)) ?? [];
      } catch (error) {
        throw error;
      }
    },
    delete: async (organizationId: string, memberId: string) => {
      try {
        const response =
          await deleteResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership({
            client,
            baseURL: buildBaseUrl(client, organizationId),
            path: {
              namespace: buildNamespace('organization', organizationId),
              name: memberId,
            },
          });

        return response.data;
      } catch (error) {
        throw error;
      }
    },
    updateRole: async (
      organizationId: string,
      memberId: string,
      payload: MemberUpdateRoleSchema,
      dryRun: boolean = false
    ): Promise<IMemberControlResponse> => {
      try {
        const response =
          await patchResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership({
            client,
            baseURL: buildBaseUrl(client, organizationId),
            path: { namespace: buildNamespace('organization', organizationId), name: memberId },
            query: {
              dryRun: dryRun ? 'All' : undefined,
              fieldManager: 'datum-cloud-portal',
            },
            headers: {
              'Content-Type': 'application/merge-patch+json',
            },
            body: {
              apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
              kind: 'OrganizationMembership',
              metadata: {
                name: memberId,
              },
              spec: {
                roles: [
                  {
                    name: payload.role,
                    namespace: payload.roleNamespace ?? 'milo-system',
                  },
                ],
              },
            },
          });

        const member = response.data as ComMiloapisResourcemanagerV1Alpha1OrganizationMembership;

        return transform(member);
      } catch (error) {
        throw error;
      }
    },
  };
};
