import {
  ComMiloapisIamV1Alpha1PolicyBinding,
  ComMiloapisIamV1Alpha1PolicyBindingList,
  listIamMiloapisComV1Alpha1NamespacedPolicyBinding,
} from '@/modules/control-plane/iam';
import { IPolicyBindingControlResponse } from '@/resources/interfaces/policy-binding.interface';
import { buildNamespace } from '@/utils/common';
import { Client } from '@hey-api/client-axios';

export const createPolicyBindingsControl = (client: Client) => {
  const buildBaseUrl = (client: Client, organizationId: string) =>
    `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${organizationId}/control-plane`;

  /**
   * Transforms API response to our interface, including scope information
   */
  const transform = (
    policyBinding: ComMiloapisIamV1Alpha1PolicyBinding
  ): IPolicyBindingControlResponse => {
    const { metadata, spec, status } = policyBinding;
    return {
      name: metadata?.name ?? '',
      createdAt: metadata?.creationTimestamp ?? '',
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      namespace: metadata?.namespace ?? '',
      subjects: spec?.subjects ?? [],
      roleRef: spec?.roleRef,
      resourceSelector: spec?.resourceSelector,
      status: status as any,
    };
  };

  return {
    list: async (organizationId: string) => {
      try {
        const response = await listIamMiloapisComV1Alpha1NamespacedPolicyBinding({
          client,
          baseURL: buildBaseUrl(client, organizationId),
          path: {
            namespace: buildNamespace('organization', organizationId),
          },
        });

        const policyBindings = response.data as ComMiloapisIamV1Alpha1PolicyBindingList;

        return policyBindings.items?.map((item) => transform(item)) ?? [];
      } catch (e) {
        throw e;
      }
    },
  };
};
