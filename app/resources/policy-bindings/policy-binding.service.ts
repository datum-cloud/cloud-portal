import {
  toPolicyBinding,
  toPolicyBindingList,
  toCreatePolicyBindingPayload,
  toUpdatePolicyBindingPayload,
} from './policy-binding.adapter';
import type {
  PolicyBinding,
  CreatePolicyBindingInput,
  UpdatePolicyBindingInput,
} from './policy-binding.schema';
import {
  listIamMiloapisComV1Alpha1NamespacedPolicyBinding,
  createIamMiloapisComV1Alpha1NamespacedPolicyBinding,
  readIamMiloapisComV1Alpha1NamespacedPolicyBinding,
  deleteIamMiloapisComV1Alpha1NamespacedPolicyBinding,
  patchIamMiloapisComV1Alpha1NamespacedPolicyBinding,
  type ComMiloapisIamV1Alpha1PolicyBindingList,
  type ComMiloapisIamV1Alpha1PolicyBinding,
} from '@/modules/control-plane/iam';
import { logger } from '@/modules/logger';
import type { ServiceOptions } from '@/resources/base/types';
import { buildOrganizationNamespace } from '@/utils/common';
import { mapApiError } from '@/utils/errors/error-mapper';
import { getOrgScopedBase } from '@/utils/scoped-urls';

export const policyBindingKeys = {
  all: ['policy-bindings'] as const,
  lists: () => [...policyBindingKeys.all, 'list'] as const,
  list: (organizationId: string) => [...policyBindingKeys.lists(), organizationId] as const,
  details: () => [...policyBindingKeys.all, 'detail'] as const,
  detail: (organizationId: string, name: string) =>
    [...policyBindingKeys.details(), organizationId, name] as const,
};

const SERVICE_NAME = 'PolicyBindingService';

export function createPolicyBindingService() {
  return {
    /**
     * List all policy bindings in an organization
     */
    async list(organizationId: string, _options?: ServiceOptions): Promise<PolicyBinding[]> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(organizationId);

        logger.service(SERVICE_NAME, 'list', {
          input: { organizationId },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchList(organizationId: string): Promise<PolicyBinding[]> {
      const response = await listIamMiloapisComV1Alpha1NamespacedPolicyBinding({
        baseURL: getOrgScopedBase(organizationId),
        path: {
          namespace: buildOrganizationNamespace(organizationId),
        },
      });

      const data = response.data as ComMiloapisIamV1Alpha1PolicyBindingList;
      return toPolicyBindingList(data?.items ?? []).items;
    },

    /**
     * Get a single policy binding by ID
     */
    async get(
      organizationId: string,
      id: string,
      _options?: ServiceOptions
    ): Promise<PolicyBinding> {
      const startTime = Date.now();

      try {
        const result = await this.fetchOne(organizationId, id);

        logger.service(SERVICE_NAME, 'get', {
          input: { organizationId, id },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchOne(organizationId: string, id: string): Promise<PolicyBinding> {
      const response = await readIamMiloapisComV1Alpha1NamespacedPolicyBinding({
        baseURL: getOrgScopedBase(organizationId),
        path: {
          namespace: buildOrganizationNamespace(organizationId),
          name: id,
        },
      });

      const data = response.data as ComMiloapisIamV1Alpha1PolicyBinding;
      return toPolicyBinding(data);
    },

    /**
     * Create a new policy binding
     */
    async create(
      organizationId: string,
      input: CreatePolicyBindingInput,
      options?: ServiceOptions
    ): Promise<PolicyBinding | ComMiloapisIamV1Alpha1PolicyBinding> {
      const startTime = Date.now();

      try {
        const payload = toCreatePolicyBindingPayload(input);

        const response = await createIamMiloapisComV1Alpha1NamespacedPolicyBinding({
          baseURL: getOrgScopedBase(organizationId),
          path: {
            namespace: buildOrganizationNamespace(organizationId),
          },
          query: {
            dryRun: options?.dryRun ? 'All' : undefined,
          },
          body: payload,
        });

        const data = response.data as ComMiloapisIamV1Alpha1PolicyBinding;

        // Return raw response for dryRun
        if (options?.dryRun) {
          return data;
        }

        const policyBinding = toPolicyBinding(data);

        logger.service(SERVICE_NAME, 'create', {
          input: { organizationId, role: input.role },
          duration: Date.now() - startTime,
        });

        return policyBinding;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Update an existing policy binding
     */
    async update(
      organizationId: string,
      id: string,
      input: UpdatePolicyBindingInput,
      options?: ServiceOptions
    ): Promise<PolicyBinding | ComMiloapisIamV1Alpha1PolicyBinding> {
      const startTime = Date.now();

      try {
        const payload = toUpdatePolicyBindingPayload(input);

        const response = await patchIamMiloapisComV1Alpha1NamespacedPolicyBinding({
          baseURL: getOrgScopedBase(organizationId),
          path: {
            namespace: buildOrganizationNamespace(organizationId),
            name: id,
          },
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
          query: {
            fieldManager: 'datum-cloud-portal',
          },
          body: payload,
        });

        const data = response.data as ComMiloapisIamV1Alpha1PolicyBinding;

        // Return raw response for dryRun
        if (options?.dryRun) {
          return data;
        }

        const policyBinding = toPolicyBinding(data);

        logger.service(SERVICE_NAME, 'update', {
          input: { organizationId, id },
          duration: Date.now() - startTime,
        });

        return policyBinding;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Delete a policy binding
     */
    async delete(organizationId: string, id: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteIamMiloapisComV1Alpha1NamespacedPolicyBinding({
          baseURL: getOrgScopedBase(organizationId),
          path: {
            namespace: buildOrganizationNamespace(organizationId),
            name: id,
          },
        });

        logger.service(SERVICE_NAME, 'delete', {
          input: { organizationId, id },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type PolicyBindingService = ReturnType<typeof createPolicyBindingService>;
