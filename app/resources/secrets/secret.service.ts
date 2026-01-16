import {
  toSecret,
  toSecretList,
  toCreateSecretPayload,
  toUpdateSecretPayload,
} from './secret.adapter';
import type { Secret, CreateSecretInput, UpdateSecretInput } from './secret.schema';
import {
  listCoreV1NamespacedSecret,
  readCoreV1NamespacedSecret,
  createCoreV1NamespacedSecret,
  patchCoreV1NamespacedSecret,
  deleteCoreV1NamespacedSecret,
  type IoK8sApiCoreV1SecretList,
  type IoK8sApiCoreV1Secret,
} from '@/modules/control-plane/k8s-core';
import { logger } from '@/modules/logger';
import type { ServiceOptions } from '@/resources/base/types';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const secretKeys = {
  all: ['secrets'] as const,
  lists: () => [...secretKeys.all, 'list'] as const,
  list: (projectId: string) => [...secretKeys.lists(), projectId] as const,
  details: () => [...secretKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) => [...secretKeys.details(), projectId, name] as const,
};

const SERVICE_NAME = 'SecretService';

export function createSecretService() {
  return {
    /**
     * List all secrets in a project
     */
    async list(projectId: string, _options?: ServiceOptions): Promise<Secret[]> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(projectId);

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchList(projectId: string): Promise<Secret[]> {
      const response = await listCoreV1NamespacedSecret({
        baseURL: getProjectScopedBase(projectId),
        path: { namespace: 'default' },
      });

      const data = response.data as IoK8sApiCoreV1SecretList;
      return toSecretList(data?.items ?? []).items;
    },

    /**
     * Get a single secret by name
     */
    async get(projectId: string, name: string, _options?: ServiceOptions): Promise<Secret> {
      const startTime = Date.now();

      try {
        const result = await this.fetchOne(projectId, name);

        logger.service(SERVICE_NAME, 'get', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchOne(projectId: string, name: string): Promise<Secret> {
      const response = await readCoreV1NamespacedSecret({
        baseURL: getProjectScopedBase(projectId),
        path: { namespace: 'default', name },
      });

      const secretData = response.data as IoK8sApiCoreV1Secret;

      if (!secretData) {
        throw new Error(`Secret ${name} not found`);
      }

      return toSecret(secretData);
    },

    /**
     * Create a new secret
     */
    async create(
      projectId: string,
      input: CreateSecretInput,
      options?: ServiceOptions
    ): Promise<Secret | IoK8sApiCoreV1Secret> {
      const startTime = Date.now();

      try {
        const payload = toCreateSecretPayload(input);

        const response = await createCoreV1NamespacedSecret({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' },
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
          headers: { 'Content-Type': 'application/json' },
        });

        const secretData = response.data as IoK8sApiCoreV1Secret;

        if (!secretData) {
          throw new Error('Failed to create secret');
        }

        // Return raw response for dryRun
        if (options?.dryRun) {
          return secretData;
        }

        const secret = toSecret(secretData);

        logger.service(SERVICE_NAME, 'create', {
          input: { projectId, name: input.name },
          duration: Date.now() - startTime,
        });

        return secret;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Update an existing secret
     */
    async update(
      projectId: string,
      name: string,
      input: UpdateSecretInput,
      options?: ServiceOptions
    ): Promise<Secret | IoK8sApiCoreV1Secret> {
      const startTime = Date.now();

      try {
        const payload = toUpdateSecretPayload(input);

        const response = await patchCoreV1NamespacedSecret({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
          body: payload,
          query: {
            ...(options?.dryRun ? { dryRun: 'All' } : {}),
            fieldManager: 'datum-cloud-portal',
          },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });

        const secretData = response.data as IoK8sApiCoreV1Secret;

        if (!secretData) {
          throw new Error('Failed to update secret');
        }

        // Return raw response for dryRun
        if (options?.dryRun) {
          return secretData;
        }

        const secret = toSecret(secretData);

        logger.service(SERVICE_NAME, 'update', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return secret;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Delete a secret
     */
    async delete(projectId: string, name: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteCoreV1NamespacedSecret({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
        });

        logger.service(SERVICE_NAME, 'delete', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type SecretService = ReturnType<typeof createSecretService>;
