import {
  toServiceAccount,
  toServiceAccountKey,
  toCreateServiceAccountPayload,
  toCreateServiceAccountKeyPayload,
} from './service-account.adapter';
import type {
  ServiceAccount,
  ServiceAccountKey,
  CreateServiceAccountInput,
  UpdateServiceAccountInput,
  CreateServiceAccountKeyInput,
  CreateServiceAccountKeyResponse,
  DatumCredentialsFile,
} from './types';
import {
  listIamMiloapisComV1Alpha1ServiceAccount,
  readIamMiloapisComV1Alpha1ServiceAccount,
  createIamMiloapisComV1Alpha1ServiceAccount,
  patchIamMiloapisComV1Alpha1ServiceAccount,
  deleteIamMiloapisComV1Alpha1ServiceAccount,
  type ComMiloapisIamV1Alpha1ServiceAccount,
  type ComMiloapisIamV1Alpha1ServiceAccountList,
} from '@/modules/control-plane/iam';
import {
  listIdentityMiloapisComV1Alpha1ServiceAccountKey,
  createIdentityMiloapisComV1Alpha1ServiceAccountKey,
  deleteIdentityMiloapisComV1Alpha1ServiceAccountKey,
  type ComMiloapisGoMiloPkgApisIdentityV1Alpha1ServiceAccountKey,
  type ComMiloapisGoMiloPkgApisIdentityV1Alpha1ServiceAccountKeyList,
} from '@/modules/control-plane/identity';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const serviceAccountKeys = {
  all: ['service-accounts'] as const,
  lists: () => [...serviceAccountKeys.all, 'list'] as const,
  list: (projectId: string) => [...serviceAccountKeys.lists(), projectId] as const,
  details: () => [...serviceAccountKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) =>
    [...serviceAccountKeys.details(), projectId, name] as const,
  keyLists: () => [...serviceAccountKeys.all, 'keys'] as const,
  keyList: (projectId: string, serviceAccountName: string) =>
    [...serviceAccountKeys.keyLists(), projectId, serviceAccountName] as const,
};

const SERVICE_NAME = 'ServiceAccountService';

export function createServiceAccountService() {
  return {
    async list(projectId: string): Promise<ServiceAccount[]> {
      const startTime = Date.now();
      try {
        const response = await listIamMiloapisComV1Alpha1ServiceAccount({
          baseURL: getProjectScopedBase(projectId),
        });
        const data = response.data as ComMiloapisIamV1Alpha1ServiceAccountList;
        logger.service(SERVICE_NAME, 'list', {
          input: { projectId },
          duration: Date.now() - startTime,
        });
        return (data?.items ?? []).map(toServiceAccount);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async get(projectId: string, name: string): Promise<ServiceAccount> {
      const startTime = Date.now();
      try {
        const response = await readIamMiloapisComV1Alpha1ServiceAccount({
          baseURL: getProjectScopedBase(projectId),
          path: { name },
        });
        const data = response.data as ComMiloapisIamV1Alpha1ServiceAccount;
        if (!data) throw new Error(`Service account ${name} not found`);
        logger.service(SERVICE_NAME, 'get', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });
        return toServiceAccount(data);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async create(projectId: string, input: CreateServiceAccountInput): Promise<ServiceAccount> {
      const startTime = Date.now();
      try {
        const response = await createIamMiloapisComV1Alpha1ServiceAccount({
          baseURL: getProjectScopedBase(projectId),
          body: toCreateServiceAccountPayload(input.name, input.displayName, input.useCase),
          headers: { 'Content-Type': 'application/json' },
        });
        const data = response.data as ComMiloapisIamV1Alpha1ServiceAccount;
        if (!data) throw new Error('Failed to create service account');
        logger.service(SERVICE_NAME, 'create', {
          input: { projectId, name: input.name },
          duration: Date.now() - startTime,
        });
        return toServiceAccount(data);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async update(
      projectId: string,
      name: string,
      input: UpdateServiceAccountInput
    ): Promise<ServiceAccount> {
      const startTime = Date.now();
      try {
        const patch: ComMiloapisIamV1Alpha1ServiceAccount = {
          ...(input.status !== undefined && {
            spec: { state: input.status === 'Disabled' ? 'Inactive' : 'Active' },
          }),
          ...(input.displayName !== undefined && {
            metadata: {
              annotations: { 'kubernetes.io/description': input.displayName },
            },
          }),
        };
        const response = await patchIamMiloapisComV1Alpha1ServiceAccount({
          baseURL: getProjectScopedBase(projectId),
          path: { name },
          body: patch,
          query: { fieldManager: 'datum-cloud-portal' },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });
        const data = response.data as ComMiloapisIamV1Alpha1ServiceAccount;
        if (!data) throw new Error('Failed to update service account');
        logger.service(SERVICE_NAME, 'update', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });
        return toServiceAccount(data);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async delete(projectId: string, name: string): Promise<void> {
      const startTime = Date.now();
      try {
        await deleteIamMiloapisComV1Alpha1ServiceAccount({
          baseURL: getProjectScopedBase(projectId),
          path: { name },
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

    async listKeys(projectId: string, serviceAccountEmail: string): Promise<ServiceAccountKey[]> {
      const startTime = Date.now();
      try {
        const response = await listIdentityMiloapisComV1Alpha1ServiceAccountKey({
          baseURL: getProjectScopedBase(projectId),
        });
        const data = response.data as ComMiloapisGoMiloPkgApisIdentityV1Alpha1ServiceAccountKeyList;
        logger.service(SERVICE_NAME, 'listKeys', {
          input: { projectId, serviceAccountEmail },
          duration: Date.now() - startTime,
        });
        return (data?.items ?? [])
          .filter((k) => k.spec?.serviceAccountUserName === serviceAccountEmail)
          .map(toServiceAccountKey);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listKeys failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async createKey(
      projectId: string,
      serviceAccountEmail: string,
      input: CreateServiceAccountKeyInput
    ): Promise<CreateServiceAccountKeyResponse> {
      const startTime = Date.now();
      try {
        const response = await createIdentityMiloapisComV1Alpha1ServiceAccountKey({
          baseURL: getProjectScopedBase(projectId),
          body: toCreateServiceAccountKeyPayload(
            serviceAccountEmail,
            input.name,
            input.publicKey,
            input.expiresAt
          ),
          headers: { 'Content-Type': 'application/json' },
        });
        // The custom endpoint (#670) returns the private key in status when no publicKey was
        // provided. This field is not in the generated type so we access it via unknown.
        if (response.error) {
          const errData = response.error as { message?: string };
          throw new Error(errData.message ?? 'Failed to create service account key');
        }
        const data = response.data as ComMiloapisGoMiloPkgApisIdentityV1Alpha1ServiceAccountKey & {
          status?: { privateKey?: string };
        };
        if (!data) throw new Error('Failed to create service account key');
        logger.service(SERVICE_NAME, 'createKey', {
          input: { projectId, serviceAccountEmail, name: input.name },
          duration: Date.now() - startTime,
        });
        const rawPrivateKey = data.status?.privateKey;
        let credentials: DatumCredentialsFile | undefined;
        if (rawPrivateKey) {
          try {
            credentials = JSON.parse(rawPrivateKey) as DatumCredentialsFile;
          } catch {
            // not a valid credentials file
          }
        }
        return {
          key: toServiceAccountKey(data),
          credentials,
        };
      } catch (error) {
        logger.error(`${SERVICE_NAME}.createKey failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async revokeKey(projectId: string, serviceAccountName: string, keyName: string): Promise<void> {
      const startTime = Date.now();
      try {
        await deleteIdentityMiloapisComV1Alpha1ServiceAccountKey({
          baseURL: getProjectScopedBase(projectId),
          path: { name: keyName },
        });
        logger.service(SERVICE_NAME, 'revokeKey', {
          input: { projectId, serviceAccountName, keyName },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.revokeKey failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type ServiceAccountService = ReturnType<typeof createServiceAccountService>;
