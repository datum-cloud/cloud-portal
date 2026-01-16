import {
  toDomain,
  toDomainList,
  toCreateDomainPayload,
  toUpdateDomainPayload,
  toRefreshRegistrationPayload,
} from './domain.adapter';
import type { Domain, CreateDomainInput, UpdateDomainInput } from './domain.schema';
import {
  listNetworkingDatumapisComV1AlphaNamespacedDomain,
  readNetworkingDatumapisComV1AlphaNamespacedDomain,
  createNetworkingDatumapisComV1AlphaNamespacedDomain,
  patchNetworkingDatumapisComV1AlphaNamespacedDomain,
  deleteNetworkingDatumapisComV1AlphaNamespacedDomain,
  readNetworkingDatumapisComV1AlphaNamespacedDomainStatus,
  type ComDatumapisNetworkingV1AlphaDomainList,
  type ComDatumapisNetworkingV1AlphaDomain,
  type ListNetworkingDatumapisComV1AlphaNamespacedDomainData,
} from '@/modules/control-plane/networking';
import { logger } from '@/modules/logger';
import type { IExtendedControlPlaneStatus } from '@/resources/base';
import type { PaginationParams } from '@/resources/base/base.schema';
import type { ServiceOptions } from '@/resources/base/types';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';

export const domainKeys = {
  all: ['domains'] as const,
  lists: () => [...domainKeys.all, 'list'] as const,
  list: (projectId: string, params?: PaginationParams) =>
    [...domainKeys.lists(), projectId, params] as const,
  details: () => [...domainKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) => [...domainKeys.details(), projectId, name] as const,
};

const SERVICE_NAME = 'DomainService';

export function createDomainService() {
  return {
    /**
     * List all domains in a project
     */
    async list(
      projectId: string,
      query?: ListNetworkingDatumapisComV1AlphaNamespacedDomainData['query'],
      _options?: ServiceOptions
    ): Promise<Domain[]> {
      const startTime = Date.now();

      try {
        const response = await listNetworkingDatumapisComV1AlphaNamespacedDomain({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' },
          query,
        });

        const data = response.data as ComDatumapisNetworkingV1AlphaDomainList;
        const result = toDomainList(data?.items ?? [], data?.metadata?.continue);

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId, query },
          duration: Date.now() - startTime,
        });

        return result.items;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Get a single domain by name
     */
    async get(projectId: string, name: string, _options?: ServiceOptions): Promise<Domain> {
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

    async fetchOne(projectId: string, name: string): Promise<Domain> {
      const response = await readNetworkingDatumapisComV1AlphaNamespacedDomain({
        baseURL: getProjectScopedBase(projectId),
        path: { namespace: 'default', name },
      });

      if (!response.data) {
        throw new Error(`Domain ${name} not found`);
      }

      return toDomain(response.data);
    },

    /**
     * Create a new domain
     */
    async create(
      projectId: string,
      input: CreateDomainInput,
      options?: ServiceOptions
    ): Promise<Domain> {
      const startTime = Date.now();

      try {
        const payload = toCreateDomainPayload(input);

        const response = await createNetworkingDatumapisComV1AlphaNamespacedDomain({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' },
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.data) {
          throw new Error('Failed to create domain');
        }

        const domain = toDomain(response.data);

        logger.service(SERVICE_NAME, 'create', {
          input: { projectId, domainName: input.domainName },
          duration: Date.now() - startTime,
        });

        return domain;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Update an existing domain
     */
    async update(
      projectId: string,
      name: string,
      input: UpdateDomainInput,
      options?: ServiceOptions
    ): Promise<Domain> {
      const startTime = Date.now();

      try {
        const payload = toUpdateDomainPayload(input.domainName);

        const response = await patchNetworkingDatumapisComV1AlphaNamespacedDomain({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
          body: payload,
          query: {
            ...(options?.dryRun ? { dryRun: 'All' } : {}),
            fieldManager: 'datum-cloud-portal',
          },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });

        if (!response.data) {
          throw new Error('Failed to update domain');
        }

        const domain = toDomain(response.data);

        logger.service(SERVICE_NAME, 'update', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return domain;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Bulk create domains
     */
    async bulkCreate(
      projectId: string,
      domains: string[],
      options?: ServiceOptions
    ): Promise<Domain[]> {
      const startTime = Date.now();

      try {
        const results = await Promise.all(
          domains.map((domainName) => this.create(projectId, { domainName }, options))
        );

        logger.service(SERVICE_NAME, 'bulkCreate', {
          input: { projectId, count: domains.length },
          duration: Date.now() - startTime,
        });

        return results;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.bulkCreate failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Delete a domain
     */
    async delete(projectId: string, name: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteNetworkingDatumapisComV1AlphaNamespacedDomain({
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
     * Get domain status
     */
    async getStatus(projectId: string, name: string): Promise<IExtendedControlPlaneStatus> {
      const startTime = Date.now();

      try {
        const response = await readNetworkingDatumapisComV1AlphaNamespacedDomainStatus({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
        });

        const domain = response.data as ComDatumapisNetworkingV1AlphaDomain;

        logger.service(SERVICE_NAME, 'getStatus', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return transformControlPlaneStatus(domain.status);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.getStatus failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Refresh domain registration
     */
    async refreshRegistration(
      projectId: string,
      name: string,
      options?: ServiceOptions
    ): Promise<Domain> {
      const startTime = Date.now();

      try {
        const payload = toRefreshRegistrationPayload();

        const response = await patchNetworkingDatumapisComV1AlphaNamespacedDomain({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
          body: payload,
          query: {
            ...(options?.dryRun ? { dryRun: 'All' } : {}),
            fieldManager: 'datum-cloud-portal',
          },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });

        if (!response.data) {
          throw new Error('Failed to refresh domain registration');
        }

        const domain = toDomain(response.data);

        logger.service(SERVICE_NAME, 'refreshRegistration', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return domain;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.refreshRegistration failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type DomainService = ReturnType<typeof createDomainService>;
