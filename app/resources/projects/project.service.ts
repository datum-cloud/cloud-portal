import { toProject, toProjectList, toCreatePayload, toUpdatePayload } from './project.adapter';
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
  type ComMiloapisResourcemanagerV1Alpha1ProjectList,
} from '@/modules/control-plane/resource-manager';
import { logger } from '@/modules/logger';
import type { PaginationParams } from '@/resources/base/base.schema';
import type { ServiceContext, ServiceOptions } from '@/resources/base/types';
import { parseOrThrow } from '@/utils/errors/error-formatter';
import { mapApiError } from '@/utils/errors/error-mapper';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';

// Query Keys (for React Query)
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (orgId: string, params?: PaginationParams) =>
    [...projectKeys.lists(), orgId, params] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (name: string) => [...projectKeys.details(), name] as const,
};

const SERVICE_NAME = 'ProjectService';

export function createProjectService(ctx: ServiceContext) {
  const client = ctx.controlPlaneClient;
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

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
        throw mapApiError(error, ctx.requestId);
      }
    },

    async fetchList(orgId: string, params?: PaginationParams): Promise<ProjectList> {
      const response = await listResourcemanagerMiloapisComV1Alpha1Project({
        client,
        baseURL: `${baseUrl}/organizations/${orgId}/control-plane`,
        query: {
          limit: params?.limit ?? 1000,
          continue: params?.cursor,
        },
      });

      const data = response.data as ComMiloapisResourcemanagerV1Alpha1ProjectList;
      return toProjectList(data);
    },

    async get(name: string, _options?: ServiceOptions): Promise<Project> {
      const startTime = Date.now();

      try {
        const result = await this.fetchOne(name);

        logger.service(SERVICE_NAME, 'get', {
          input: { name },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async fetchOne(name: string): Promise<Project> {
      const response = await readResourcemanagerMiloapisComV1Alpha1Project({
        client,
        path: { name },
      });

      if (!response.data) {
        throw new Error(`Project ${name} not found`);
      }

      return toProject(response.data);
    },

    async getStatus(name: string) {
      const response = await readResourcemanagerMiloapisComV1Alpha1ProjectStatus({
        client,
        path: { name },
      });

      return transformControlPlaneStatus(response.data?.status);
    },

    async create(input: CreateProjectInput, options?: ServiceOptions): Promise<Project> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(createProjectSchema, input, {
          message: 'Invalid project data',
          requestId: ctx.requestId,
        });

        const payload = toCreatePayload(validated);

        const response = await createResourcemanagerMiloapisComV1Alpha1Project({
          client,
          baseURL: `${baseUrl}/organizations/${validated.organizationId}/control-plane`,
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
        });

        if (!response.data) {
          throw new Error('Failed to create project');
        }

        const project = toProject(response.data);

        logger.service(SERVICE_NAME, 'create', {
          input: { name: input.name },
          duration: Date.now() - startTime,
        });

        return project;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async update(
      name: string,
      input: UpdateProjectInput,
      options?: ServiceOptions
    ): Promise<Project> {
      const startTime = Date.now();

      try {
        const payload = toUpdatePayload(input);

        const response = await patchResourcemanagerMiloapisComV1Alpha1Project({
          client,
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
          input: { name },
          duration: Date.now() - startTime,
        });

        return project;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async delete(name: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteResourcemanagerMiloapisComV1Alpha1Project({
          client,
          path: { name },
        });

        logger.service(SERVICE_NAME, 'delete', {
          input: { name },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },
  };
}

export type ProjectService = ReturnType<typeof createProjectService>;
