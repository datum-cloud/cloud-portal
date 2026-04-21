import {
  toMachineAccount,
  toMachineAccountKey,
  toCreateMachineAccountPayload,
  toCreateMachineAccountKeyPayload,
} from './machine-account.adapter';
import type {
  MachineAccount,
  MachineAccountKey,
  CreateMachineAccountInput,
  UpdateMachineAccountInput,
  CreateMachineAccountKeyInput,
  CreateMachineAccountKeyResponse,
  DatumCredentialsFile,
} from './types';
import {
  listIamMiloapisComV1Alpha1MachineAccount,
  readIamMiloapisComV1Alpha1MachineAccount,
  createIamMiloapisComV1Alpha1MachineAccount,
  patchIamMiloapisComV1Alpha1MachineAccount,
  deleteIamMiloapisComV1Alpha1MachineAccount,
  type ComMiloapisIamV1Alpha1MachineAccount,
  type ComMiloapisIamV1Alpha1MachineAccountList,
} from '@/modules/control-plane/iam';
import {
  listIdentityMiloapisComV1Alpha1MachineAccountKey,
  createIdentityMiloapisComV1Alpha1MachineAccountKey,
  deleteIdentityMiloapisComV1Alpha1MachineAccountKey,
  type ComMiloapisGoMiloPkgApisIdentityV1Alpha1MachineAccountKey,
  type ComMiloapisGoMiloPkgApisIdentityV1Alpha1MachineAccountKeyList,
} from '@/modules/control-plane/identity';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const machineAccountKeys = {
  all: ['machine-accounts'] as const,
  lists: () => [...machineAccountKeys.all, 'list'] as const,
  list: (projectId: string) => [...machineAccountKeys.lists(), projectId] as const,
  details: () => [...machineAccountKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) =>
    [...machineAccountKeys.details(), projectId, name] as const,
  keyLists: () => [...machineAccountKeys.all, 'keys'] as const,
  keyList: (projectId: string, machineAccountName: string) =>
    [...machineAccountKeys.keyLists(), projectId, machineAccountName] as const,
};

const SERVICE_NAME = 'MachineAccountService';

export function createMachineAccountService() {
  return {
    async list(projectId: string): Promise<MachineAccount[]> {
      const startTime = Date.now();
      try {
        const response = await listIamMiloapisComV1Alpha1MachineAccount({
          baseURL: getProjectScopedBase(projectId),
        });
        const data = response.data as ComMiloapisIamV1Alpha1MachineAccountList;
        logger.service(SERVICE_NAME, 'list', {
          input: { projectId },
          duration: Date.now() - startTime,
        });
        return (data?.items ?? []).map(toMachineAccount);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async get(projectId: string, name: string): Promise<MachineAccount> {
      const startTime = Date.now();
      try {
        const response = await readIamMiloapisComV1Alpha1MachineAccount({
          baseURL: getProjectScopedBase(projectId),
          path: { name },
        });
        const data = response.data as ComMiloapisIamV1Alpha1MachineAccount;
        if (!data) throw new Error(`Machine account ${name} not found`);
        logger.service(SERVICE_NAME, 'get', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });
        return toMachineAccount(data);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async create(projectId: string, input: CreateMachineAccountInput): Promise<MachineAccount> {
      const startTime = Date.now();
      try {
        const response = await createIamMiloapisComV1Alpha1MachineAccount({
          baseURL: getProjectScopedBase(projectId),
          body: toCreateMachineAccountPayload(input.name, input.displayName),
          headers: { 'Content-Type': 'application/json' },
        });
        const data = response.data as ComMiloapisIamV1Alpha1MachineAccount;
        if (!data) throw new Error('Failed to create machine account');
        logger.service(SERVICE_NAME, 'create', {
          input: { projectId, name: input.name },
          duration: Date.now() - startTime,
        });
        return toMachineAccount(data);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async update(
      projectId: string,
      name: string,
      input: UpdateMachineAccountInput
    ): Promise<MachineAccount> {
      const startTime = Date.now();
      try {
        const patch: ComMiloapisIamV1Alpha1MachineAccount = {
          ...(input.status !== undefined && {
            spec: { state: input.status === 'Disabled' ? 'Inactive' : 'Active' },
          }),
          ...(input.displayName !== undefined && {
            metadata: {
              annotations: { 'kubernetes.io/description': input.displayName },
            },
          }),
        };
        const response = await patchIamMiloapisComV1Alpha1MachineAccount({
          baseURL: getProjectScopedBase(projectId),
          path: { name },
          body: patch,
          query: { fieldManager: 'datum-cloud-portal' },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });
        const data = response.data as ComMiloapisIamV1Alpha1MachineAccount;
        if (!data) throw new Error('Failed to update machine account');
        logger.service(SERVICE_NAME, 'update', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });
        return toMachineAccount(data);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async delete(projectId: string, name: string): Promise<void> {
      const startTime = Date.now();
      try {
        await deleteIamMiloapisComV1Alpha1MachineAccount({
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

    async listKeys(projectId: string, machineAccountEmail: string): Promise<MachineAccountKey[]> {
      const startTime = Date.now();
      try {
        const response = await listIdentityMiloapisComV1Alpha1MachineAccountKey({
          baseUrl: getProjectScopedBase(projectId),
        });
        const data = response.data as ComMiloapisGoMiloPkgApisIdentityV1Alpha1MachineAccountKeyList;
        logger.service(SERVICE_NAME, 'listKeys', {
          input: { projectId, machineAccountEmail },
          duration: Date.now() - startTime,
        });
        return (data?.items ?? [])
          .filter((k) => k.spec?.machineAccountUserName === machineAccountEmail)
          .map(toMachineAccountKey);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listKeys failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async createKey(
      projectId: string,
      machineAccountEmail: string,
      input: CreateMachineAccountKeyInput
    ): Promise<CreateMachineAccountKeyResponse> {
      const startTime = Date.now();
      try {
        const response = await createIdentityMiloapisComV1Alpha1MachineAccountKey({
          baseUrl: getProjectScopedBase(projectId),
          body: toCreateMachineAccountKeyPayload(
            machineAccountEmail,
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
          throw new Error(errData.message ?? 'Failed to create machine account key');
        }
        const data = response.data as ComMiloapisGoMiloPkgApisIdentityV1Alpha1MachineAccountKey & {
          status?: { privateKey?: string };
        };
        if (!data) throw new Error('Failed to create machine account key');
        logger.service(SERVICE_NAME, 'createKey', {
          input: { projectId, machineAccountEmail, name: input.name },
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
          key: toMachineAccountKey(data),
          credentials,
        };
      } catch (error) {
        logger.error(`${SERVICE_NAME}.createKey failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async revokeKey(projectId: string, machineAccountName: string, keyName: string): Promise<void> {
      const startTime = Date.now();
      try {
        await deleteIdentityMiloapisComV1Alpha1MachineAccountKey({
          baseUrl: getProjectScopedBase(projectId),
          path: { name: keyName },
        });
        logger.service(SERVICE_NAME, 'revokeKey', {
          input: { projectId, machineAccountName, keyName },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.revokeKey failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type MachineAccountService = ReturnType<typeof createMachineAccountService>;
