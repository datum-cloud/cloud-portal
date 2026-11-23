import {
  toProject,
  toProjectList,
  toProjectListAll,
  toCreatePayload,
  toUpdatePayload,
} from './project.adapter';
import {
  createProjectSchema,
  type Project,
  type ProjectList,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './project.schema';
import {
  listResourcemanagerMiloapisComV1Alpha1Project,
  readResourcemanagerMiloapisComV1Alpha1Project,
  createResourcemanagerMiloapisComV1Alpha1Project,
  patchResourcemanagerMiloapisComV1Alpha1Project,
  deleteResourcemanagerMiloapisComV1Alpha1Project,
  readResourcemanagerMiloapisComV1Alpha1ProjectStatus,
} from '@/modules/control-plane/resource-manager';
import { logger } from '@/modules/logger';
import type { PaginationParams } from '@/resources/base/base.schema';
import type { ServiceOptions } from '@/resources/base/types';
import { getOrgScopedBase } from '@/resources/base/utils';
import { NotFoundError } from '@/utils/errors';
import { parseOrThrow } from '@/utils/errors/error-formatter';
import { mapApiError } from '@/utils/errors/error-mapper';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';

// Query Keys (for React Query)
/** Sync-state kind of project rows: the list's row keys, its watch, and its mutations. */
export const PROJECT_SYNC_KIND = 'projects';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (orgId: string, params?: PaginationParams) =>
    [...projectKeys.lists(), orgId, params] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (name: string) => [...projectKeys.details(), name] as const,
};

const SERVICE_NAME = 'ProjectService';

export function createProjectService() {
  return {
    async list(
      orgId: string,
      params?: PaginationParams,
      _options?: ServiceOptions
    ): Promise<ProjectList> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(orgId, params);

        logger.service(SERVICE_NAME, 'list', {
          input: { orgId, params },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchList(orgId: string, params?: PaginationParams): Promise<ProjectList> {
      const response = await listResourcemanagerMiloapisComV1Alpha1Project({
        baseURL: getOrgScopedBase(orgId),
        query: {
          limit: params?.limit ?? 1000,
          continue: params?.cursor,
        },
      });

      if (!response.data) {
        return { items: [], nextCursor: null, hasMore: false };
      }

      return toProjectList(response.data);
    },

    /** Lists all non-deleting projects, including those still provisioning. */
    async fetchListAll(orgId: string, params?: PaginationParams): Promise<ProjectList> {
      const response = await listResourcemanagerMiloapisComV1Alpha1Project({
        baseURL: getOrgScopedBase(orgId),
        query: {
          limit: params?.limit ?? 1000,
          continue: params?.cursor,
        },
      });

      if (!response.data) {
        return { items: [], nextCursor: null, hasMore: false };
      }

      return toProjectListAll(response.data);
    },

    async listAll(
      orgId: string,
      params?: PaginationParams,
      _options?: ServiceOptions
    ): Promise<ProjectList> {
      const startTime = Date.now();

      try {
        const result = await this.fetchListAll(orgId, params);

        logger.service(SERVICE_NAME, 'listAll', {
          input: { orgId, params },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listAll failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Pass `orgId` whenever the caller knows it, so Milo records the read
     * against the organization. Callers that only have the project name read
     * it at the root, since that read is how they learn the organization.
     */
    async get(name: string, orgId?: string): Promise<Project> {
      const startTime = Date.now();

      try {
        const result = await this.fetchOne(name, orgId);

        logger.service(SERVICE_NAME, 'get', {
          input: { name, orgId },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchOne(name: string, orgId?: string): Promise<Project> {
      const response = await readResourcemanagerMiloapisComV1Alpha1Project({
        ...(orgId ? { baseURL: getOrgScopedBase(orgId) } : {}),
        path: { name },
      });

      if (!response.data) {
        throw new NotFoundError('Project', name);
      }

      return toProject(response.data);
    },

    async getStatus(name: string) {
      const response = await readResourcemanagerMiloapisComV1Alpha1ProjectStatus({
        path: { name },
      });

      return transformControlPlaneStatus(response.data?.status);
    },

    async create(input: CreateProjectInput, options?: ServiceOptions): Promise<Project> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(createProjectSchema, input, {
          message: 'Invalid project data',
        });

        const payload = toCreatePayload(validated);

        const response = await createResourcemanagerMiloapisComV1Alpha1Project({
          baseURL: getOrgScopedBase(validated.organizationId),
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
        });

        if (!response.data) {
          throw new Error('Failed to create project');
        }

        const project = toProject(response.data);

        logger.service(SERVICE_NAME, 'create', {
          input: { name: project.name },
          duration: Date.now() - startTime,
        });

        return project;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async update(
      orgId: string,
      name: string,
      input: UpdateProjectInput,
      options?: ServiceOptions
    ): Promise<Project> {
      const startTime = Date.now();

      try {
        const payload = toUpdatePayload(input);

        const response = await patchResourcemanagerMiloapisComV1Alpha1Project({
          baseURL: getOrgScopedBase(orgId),
          path: { name },
          body: payload,
          query: {
            ...(options?.dryRun ? { dryRun: 'All' } : {}),
            fieldManager: 'datum-cloud-portal',
          },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });

        if (!response.data) {
          throw new Error('Failed to update project');
        }

        const project = toProject(response.data);

        logger.service(SERVICE_NAME, 'update', {
          input: { orgId, name },
          duration: Date.now() - startTime,
        });

        return project;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async delete(orgId: string, name: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteResourcemanagerMiloapisComV1Alpha1Project({
          baseURL: getOrgScopedBase(orgId),
          path: { name },
        });

        logger.service(SERVICE_NAME, 'delete', {
          input: { orgId, name },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type ProjectService = ReturnType<typeof createProjectService>;
