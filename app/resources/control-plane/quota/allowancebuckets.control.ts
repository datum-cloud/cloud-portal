import {
  ComMiloapisQuotaV1Alpha1AllowanceBucket,
  ComMiloapisQuotaV1Alpha1AllowanceBucketList,
  listQuotaMiloapisComV1Alpha1NamespacedAllowanceBucket,
} from '@/modules/control-plane/quota';
import { IAllowanceBucketControlResponse } from '@/resources/interfaces/allowance-bucket';
import { buildNamespace } from '@/utils/common';
import { Client } from '@hey-api/client-axios';

export const createAllowanceBucketsControl = (client: Client) => {
  const buildBaseUrl = (client: Client, namespace: 'organization' | 'project', id: string) =>
    `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1/${namespace}s/${id}/control-plane`;

  const transform = (
    resourceGrant: ComMiloapisQuotaV1Alpha1AllowanceBucket
  ): IAllowanceBucketControlResponse => {
    const { metadata, spec, status } = resourceGrant;
    return {
      name: metadata?.name ?? '',
      createdAt: metadata?.creationTimestamp,
      uid: metadata?.uid ?? '',
      namespace: metadata?.namespace ?? '',
      resourceType: spec.resourceType,
      status: status,
    };
  };

  return {
    list: async (namespace: 'organization' | 'project', id: string) => {
      const response = await listQuotaMiloapisComV1Alpha1NamespacedAllowanceBucket({
        client,
        baseURL: buildBaseUrl(client, namespace, id),
        path: {
          namespace: buildNamespace(namespace, id),
        },
      });

      const res = response.data as ComMiloapisQuotaV1Alpha1AllowanceBucketList;

      return res.items?.map((item) => transform(item)) ?? [];
    },
  };
};
