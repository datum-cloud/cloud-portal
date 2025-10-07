import {
  ComMiloapisQuotaV1Alpha1ResourceGrant,
  ComMiloapisQuotaV1Alpha1ResourceGrantList,
  listQuotaMiloapisComV1Alpha1NamespacedResourceGrant,
} from '@/modules/control-plane/quota';
import { IResourceGrantControlResponse } from '@/resources/interfaces/resource-grant.interface';
import { Client } from '@hey-api/client-axios';

export const createResourceGrantsControl = (client: Client) => {
  const buildBaseUrl = (client: Client, organizationId: string) =>
    `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${organizationId}/control-plane`;

  const transform = (
    resourceGrant: ComMiloapisQuotaV1Alpha1ResourceGrant
  ): IResourceGrantControlResponse => {
    const { metadata, spec, status } = resourceGrant;
    return {
      name: metadata?.name ?? '',
      createdAt: metadata?.creationTimestamp,
      uid: metadata?.uid ?? '',
      namespace: metadata?.namespace ?? '',
      status,
    };
  };

  return {
    list: async (organizationId: string) => {
      const response = await listQuotaMiloapisComV1Alpha1NamespacedResourceGrant({
        client,
        baseURL: buildBaseUrl(client, organizationId),
        path: {
          namespace: 'default',
        },
      });

      const resourceGrants = response.data as ComMiloapisQuotaV1Alpha1ResourceGrantList;

      return resourceGrants.items?.map((item) => transform(item)) ?? [];
    },
  };
};
