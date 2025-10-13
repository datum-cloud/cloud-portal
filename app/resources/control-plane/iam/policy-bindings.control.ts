import { POLICY_RESOURCES } from '@/features/policy-binding/form/constants';
import {
  ComMiloapisIamV1Alpha1PolicyBinding,
  ComMiloapisIamV1Alpha1PolicyBindingList,
  createIamMiloapisComV1Alpha1NamespacedPolicyBinding,
  deleteIamMiloapisComV1Alpha1NamespacedPolicyBinding,
  listIamMiloapisComV1Alpha1NamespacedPolicyBinding,
  patchIamMiloapisComV1Alpha1NamespacedPolicyBinding,
  readIamMiloapisComV1Alpha1NamespacedPolicyBinding,
} from '@/modules/control-plane/iam';
import { IPolicyBindingControlResponse } from '@/resources/interfaces/policy-binding.interface';
import { NewPolicyBindingSchema } from '@/resources/schemas/policy-binding.schema';
import { buildNamespace } from '@/utils/common';
import { generateRandomString } from '@/utils/helpers/text.helper';
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

  const formatPolicyBinding = (payload: NewPolicyBindingSchema, isEdit: boolean = false) => {
    const resource = POLICY_RESOURCES[payload.resource.ref as keyof typeof POLICY_RESOURCES];

    const formatted: ComMiloapisIamV1Alpha1PolicyBinding = {
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'PolicyBinding',
      spec: {
        resourceSelector: {
          resourceRef: {
            apiGroup: resource.apiGroup,
            kind: resource.kind,
            name: payload.resource.name,
            uid: payload.resource.uid ?? '',
          },
        },
        roleRef: {
          name: payload.role,
          namespace: 'milo-system',
        },
        subjects: payload.subjects.map((subject) => ({
          kind: subject.kind as 'User' | 'Group',
          name: subject.name,
          uid: subject.uid ?? '',
        })),
      },
    };

    if (!isEdit) {
      const name = `${resource.kind}-${payload.resource.name}-${payload.role}-${generateRandomString(6)}`;
      formatted.metadata = {
        name: name.toLowerCase(),
      };
    }

    return formatted;
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
    create: async (
      organizationId: string,
      payload: NewPolicyBindingSchema,
      dryRun: boolean = false
    ) => {
      try {
        const response = await createIamMiloapisComV1Alpha1NamespacedPolicyBinding({
          client,
          baseURL: buildBaseUrl(client, organizationId),
          path: {
            namespace: buildNamespace('organization', organizationId),
          },
          query: {
            dryRun: dryRun ? 'All' : undefined,
          },
          body: formatPolicyBinding(payload),
        });

        const policyBinding = response.data as ComMiloapisIamV1Alpha1PolicyBinding;

        return dryRun ? policyBinding : transform(policyBinding);
      } catch (e) {
        throw e;
      }
    },
    detail: async (organizationId: string, id: string) => {
      try {
        const response = await readIamMiloapisComV1Alpha1NamespacedPolicyBinding({
          client,
          baseURL: buildBaseUrl(client, organizationId),
          path: {
            namespace: buildNamespace('organization', organizationId),
            name: id,
          },
        });

        const policyBinding = response.data as ComMiloapisIamV1Alpha1PolicyBinding;

        return transform(policyBinding);
      } catch (e) {
        throw e;
      }
    },
    delete: async (organizationId: string, id: string) => {
      try {
        const response = await deleteIamMiloapisComV1Alpha1NamespacedPolicyBinding({
          client,
          baseURL: buildBaseUrl(client, organizationId),
          path: {
            namespace: buildNamespace('organization', organizationId),
            name: id,
          },
        });

        return response.data;
      } catch (e) {
        throw e;
      }
    },
    update: async (
      organizationId: string,
      id: string,
      payload: NewPolicyBindingSchema,
      dryRun: boolean = false
    ) => {
      try {
        const response = await patchIamMiloapisComV1Alpha1NamespacedPolicyBinding({
          client,
          baseURL: buildBaseUrl(client, organizationId),
          path: { namespace: buildNamespace('organization', organizationId), name: id },
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
          query: {
            fieldManager: 'datum-cloud-portal',
          },
          body: formatPolicyBinding(payload, true),
        });

        const policyBinding = response.data as ComMiloapisIamV1Alpha1PolicyBinding;

        return dryRun ? policyBinding : transform(policyBinding);
      } catch (e) {
        throw e;
      }
    },
  };
};
