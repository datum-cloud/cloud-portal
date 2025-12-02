import {
  ComMiloapisIamV1Alpha1Group,
  ComMiloapisIamV1Alpha1GroupList,
  listIamMiloapisComV1Alpha1NamespacedGroup,
} from '@/modules/control-plane/iam';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IGroupControlResponse } from '@/resources/interfaces/group.interface';
import { buildNamespace } from '@/utils/common';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Client } from '@hey-api/client-axios';

export const createGroupsControl = (client: Client) => {
  const buildBaseUrl = (client: Client, organizationId: string) =>
    `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${organizationId}/control-plane`;

  /**
   * Transforms API response to our interface, including scope information
   */
  const transform = (group: ComMiloapisIamV1Alpha1Group): IGroupControlResponse => {
    const { metadata } = group;
    return {
      name: metadata?.name ?? '',
      createdAt: metadata?.creationTimestamp ?? '',
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      namespace: metadata?.namespace ?? '',
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

        return (
          policyBindings.items
            ?.filter((item) => {
              const status = transformControlPlaneStatus(item.status);
              return status.status === ControlPlaneStatus.Success;
            })
            .map((item) => transform(item)) ?? []
        );
      } catch (e) {
        throw e;
      }
    },
  };
};
