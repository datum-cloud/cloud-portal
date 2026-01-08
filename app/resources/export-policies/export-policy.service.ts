import {
  toExportPolicy,
  toExportPolicyList,
  toCreateExportPolicyPayload,
  toUpdateExportPolicyPayload,
} from './export-policy.adapter';
import type {
  ExportPolicy,
  CreateExportPolicyInput,
  UpdateExportPolicyInput,
} from './export-policy.schema';
import {
  listTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  readTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  createTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  replaceTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  deleteTelemetryDatumapisComV1Alpha1NamespacedExportPolicy,
  readTelemetryDatumapisComV1Alpha1NamespacedExportPolicyStatus,
  type ComDatumapisTelemetryV1Alpha1ExportPolicyList,
  type ComDatumapisTelemetryV1Alpha1ExportPolicy,
} from '@/modules/control-plane/telemetry';
import { logger } from '@/modules/logger';
import type { IExtendedControlPlaneStatus } from '@/resources/base';
import type { ServiceOptions } from '@/resources/base/types';
import { mapApiError } from '@/utils/errors/error-mapper';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getProjectScopedBase } from '@/utils/scoped-urls';

export const exportPolicyKeys = {
  all: ['export-policies'] as const,
  lists: () => [...exportPolicyKeys.all, 'list'] as const,
  list: (projectId: string) => [...exportPolicyKeys.lists(), projectId] as const,
  details: () => [...exportPolicyKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) =>
    [...exportPolicyKeys.details(), projectId, name] as const,
};

const SERVICE_NAME = 'ExportPolicyService';

export function createExportPolicyService() {
  return {
    /**
     * List all export policies in a project
     */
    async list(projectId: string, _options?: ServiceOptions): Promise<ExportPolicy[]> {
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

    async fetchList(projectId: string): Promise<ExportPolicy[]> {
      const response = await listTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
        baseURL: getProjectScopedBase(projectId),
        path: { namespace: 'default' },
      });

      const data = response.data as ComDatumapisTelemetryV1Alpha1ExportPolicyList;
      return toExportPolicyList(data?.items ?? []).items;
    },

    /**
     * Get a single export policy by name
     */
    async get(projectId: string, name: string, _options?: ServiceOptions): Promise<ExportPolicy> {
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

    async fetchOne(projectId: string, name: string): Promise<ExportPolicy> {
      const response = await readTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
        baseURL: getProjectScopedBase(projectId),
        path: { namespace: 'default', name },
      });

      const data = response.data as ComDatumapisTelemetryV1Alpha1ExportPolicy;

      if (!data) {
        throw new Error(`Export Policy ${name} not found`);
      }

      return toExportPolicy(data);
    },

    /**
     * Create a new export policy
     */
    async create(
      projectId: string,
      input: CreateExportPolicyInput,
      options?: ServiceOptions
    ): Promise<ExportPolicy | ComDatumapisTelemetryV1Alpha1ExportPolicy> {
      const startTime = Date.now();

      try {
        const payload = toCreateExportPolicyPayload(input);

        const response = await createTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' },
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
        });

        const data = response.data as ComDatumapisTelemetryV1Alpha1ExportPolicy;

        if (!data) {
          throw new Error('Failed to create export policy');
        }

        // Return raw response for dryRun
        if (options?.dryRun) {
          return data;
        }

        const exportPolicy = toExportPolicy(data);

        logger.service(SERVICE_NAME, 'create', {
          input: { projectId, name: input.metadata.name },
          duration: Date.now() - startTime,
        });

        return exportPolicy;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Update an existing export policy
     */
    async update(
      projectId: string,
      name: string,
      input: UpdateExportPolicyInput,
      options?: ServiceOptions
    ): Promise<ExportPolicy | ComDatumapisTelemetryV1Alpha1ExportPolicy> {
      const startTime = Date.now();

      try {
        const payload = toUpdateExportPolicyPayload(input);

        const response = await replaceTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
        });

        const data = response.data as ComDatumapisTelemetryV1Alpha1ExportPolicy;

        if (!data) {
          throw new Error('Failed to update export policy');
        }

        // Return raw response for dryRun
        if (options?.dryRun) {
          return data;
        }

        const exportPolicy = toExportPolicy(data);

        logger.service(SERVICE_NAME, 'update', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return exportPolicy;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Delete an export policy
     */
    async delete(projectId: string, name: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteTelemetryDatumapisComV1Alpha1NamespacedExportPolicy({
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

    /**
     * Get export policy status
     */
    async getStatus(projectId: string, name: string): Promise<IExtendedControlPlaneStatus> {
      const startTime = Date.now();

      try {
        const response = await readTelemetryDatumapisComV1Alpha1NamespacedExportPolicyStatus({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
        });

        const data = response.data as ComDatumapisTelemetryV1Alpha1ExportPolicy;

        logger.service(SERVICE_NAME, 'getStatus', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return transformControlPlaneStatus(data.status);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.getStatus failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type ExportPolicyService = ReturnType<typeof createExportPolicyService>;
