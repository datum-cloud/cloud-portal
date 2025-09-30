import {
  ComMiloapisResourcemanagerV1Alpha1OrganizationMembership,
  ComMiloapisResourcemanagerV1Alpha1OrganizationMembershipList,
  listResourcemanagerMiloapisComV1Alpha1NamespacedOrganizationMembership,
} from '@/modules/control-plane/resource-manager';
import { IMemberControlResponse } from '@/resources/interfaces/member.interface';
import { Client } from '@hey-api/client-axios';

export const createMembersControl = (client: Client) => {
  const buildNamespace = (organizationId: string) => `organization-${organizationId}`;
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
              namespace: buildNamespace(organizationId),
            },
          });

        const members =
          response.data as ComMiloapisResourcemanagerV1Alpha1OrganizationMembershipList;

        return members.items?.map((item) => transform(item)) ?? [];
      } catch (error) {
        throw error;
      }
    },
  };
};
