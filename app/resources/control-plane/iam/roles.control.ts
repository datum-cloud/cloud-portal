import {
  ComMiloapisIamV1Alpha1Role,
  ComMiloapisIamV1Alpha1RoleList,
  listIamMiloapisComV1Alpha1NamespacedRole,
} from '@/modules/control-plane/iam';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IRoleControlResponse } from '@/resources/interfaces/role.interface';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Client } from '@hey-api/client-axios';

export const createRolesControl = (client: Client) => {
  /**
   * Transforms API response to our interface, including scope information
   */
  const transform = (group: ComMiloapisIamV1Alpha1Role): IRoleControlResponse => {
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
    list: async () => {
      try {
        const response = await listIamMiloapisComV1Alpha1NamespacedRole({
          client,
          path: {
            namespace: 'datum-cloud',
          },
        });

        const res = response.data as ComMiloapisIamV1Alpha1RoleList;

        console.log('molly', res.items);
        return (
          res.items
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
