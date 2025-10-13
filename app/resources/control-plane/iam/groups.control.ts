import {
  ComMiloapisIamV1Alpha1Group,
  ComMiloapisIamV1Alpha1GroupList,
  listIamMiloapisComV1Alpha1NamespacedGroup,
} from '@/modules/control-plane/iam';
import { IGroupControlResponse } from '@/resources/interfaces/group.interface';
import { buildNamespace } from '@/utils/common';
import { Client } from '@hey-api/client-axios';

export const createGroupsControl = (client: Client) => {
  const buildBaseUrl = (client: Client, organizationId: string) =>
    `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${organizationId}/control-plane`;

  /**
   * Transforms API response to our interface, including scope information
   */
  const transform = (group: ComMiloapisIamV1Alpha1Group): IGroupControlResponse => {
    const { metadata, status } = group;
    return {
      name: metadata?.name ?? '',
      createdAt: metadata?.creationTimestamp ?? '',
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      namespace: metadata?.namespace ?? '',
      status: status as any,
    };
  };

  return {
    list: async (organizationId: string) => {
      try {
        const response = await listIamMiloapisComV1Alpha1NamespacedGroup({
          client,
          baseURL: buildBaseUrl(client, organizationId),
          path: {
            namespace: buildNamespace('organization', organizationId),
          },
        });

        const policyBindings = response.data as ComMiloapisIamV1Alpha1GroupList;

        return policyBindings.items?.map((item) => transform(item)) ?? [];
      } catch (e) {
        throw e;
      }
    },
  };
};
