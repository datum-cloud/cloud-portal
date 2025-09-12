import {
  ComMiloapisIamV1Alpha1PolicyBinding,
  ComMiloapisIamV1Alpha1PolicyBindingList,
  listIamMiloapisComV1Alpha1NamespacedPolicyBinding,
} from '@/modules/control-plane/iam';
import {
  IPolicyBindingControlResponse,
  IPolicyBindingScope,
} from '@/resources/interfaces/policy-binding.interface';
import { Client } from '@hey-api/client-axios';

export const createPolicyBindingsControl = (client: Client) => {
  const buildBaseUrl = (scope: IPolicyBindingScope): string => {
    const baseUrl = client.instance.defaults.baseURL;

    return `${baseUrl}/apis/resourcemanager.miloapis.com/v1alpha1/${scope.type}s/${scope.id}/control-plane`;
  };

  /**
   * Transforms API response to our interface, including scope information
   */
  const transformPolicyBinding = (
    policyBinding: ComMiloapisIamV1Alpha1PolicyBinding,
    scope: IPolicyBindingScope
  ): IPolicyBindingControlResponse => {
    const { metadata, spec, status } = policyBinding;
    return {
      name: metadata?.name ?? '',
      createdAt: metadata?.creationTimestamp ?? '',
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      namespace: metadata?.namespace ?? '',
      scope, // Include scope information
      subjects: spec?.subjects ?? [],
      roleRef: spec?.roleRef,
      resourceSelector: spec?.resourceSelector,
      status: status as any,
    };
  };

  return {
    list: async (scope: IPolicyBindingScope) => {
      try {
        const response = await listIamMiloapisComV1Alpha1NamespacedPolicyBinding({
          client,
          baseURL: buildBaseUrl(scope),
          path: {
            namespace: `${scope.type}-${scope.id}`,
          },
        });

        const policyBindings = response.data as ComMiloapisIamV1Alpha1PolicyBindingList;

        return policyBindings.items?.map((item) => transformPolicyBinding(item, scope)) ?? [];
      } catch (e) {
        throw e;
      }
    },
  };
};
