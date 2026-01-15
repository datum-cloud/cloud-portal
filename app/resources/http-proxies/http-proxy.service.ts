import {
  toHttpProxy,
  toHttpProxyList,
  toCreateHttpProxyPayload,
  toUpdateHttpProxyPayload,
} from './http-proxy.adapter';
import type { HttpProxy, CreateHttpProxyInput, UpdateHttpProxyInput } from './http-proxy.schema';
import {
  listNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  readNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  createNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  patchNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  deleteNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  type ComDatumapisNetworkingV1AlphaHttpProxyList,
  type ComDatumapisNetworkingV1AlphaHttpProxy,
  type ListNetworkingDatumapisComV1AlphaNamespacedHttpProxyData,
} from '@/modules/control-plane/networking';
import { logger } from '@/modules/logger';
import type { ServiceOptions } from '@/resources/base/types';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const httpProxyKeys = {
  all: ['http-proxies'] as const,
  lists: () => [...httpProxyKeys.all, 'list'] as const,
  list: (projectId: string) => [...httpProxyKeys.lists(), projectId] as const,
  details: () => [...httpProxyKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) =>
    [...httpProxyKeys.details(), projectId, name] as const,
};

const SERVICE_NAME = 'HttpProxyService';

export function createHttpProxyService() {
  return {
    /**
     * List all HTTP proxies in a project
     */
    async list(
      projectId: string,
      query?: ListNetworkingDatumapisComV1AlphaNamespacedHttpProxyData['query'],
      _options?: ServiceOptions
    ): Promise<HttpProxy[]> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(projectId, query);

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

    async fetchList(
      projectId: string,
      query?: ListNetworkingDatumapisComV1AlphaNamespacedHttpProxyData['query']
    ): Promise<HttpProxy[]> {
      const response = await listNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
        baseURL: getProjectScopedBase(projectId),
        path: { namespace: 'default' },
        query,
      });

      const data = response.data as ComDatumapisNetworkingV1AlphaHttpProxyList;
      return toHttpProxyList(data?.items ?? []).items;
    },

    /**
     * Get a single HTTP proxy by name
     */
    async get(projectId: string, name: string, _options?: ServiceOptions): Promise<HttpProxy> {
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

    async fetchOne(projectId: string, name: string): Promise<HttpProxy> {
      const response = await readNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
        baseURL: getProjectScopedBase(projectId),
        path: { namespace: 'default', name },
      });

      const data = response.data as ComDatumapisNetworkingV1AlphaHttpProxy;

      if (!data) {
        throw new Error(`HTTP Proxy ${name} not found`);
      }

      return toHttpProxy(data);
    },

    /**
     * Create a new HTTP proxy
     */
    async create(
      projectId: string,
      input: CreateHttpProxyInput,
      options?: ServiceOptions
    ): Promise<HttpProxy | ComDatumapisNetworkingV1AlphaHttpProxy> {
      const startTime = Date.now();

      try {
        const payload = toCreateHttpProxyPayload(input);

        const response = await createNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' },
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
          headers: { 'Content-Type': 'application/json' },
        });

        const data = response.data as ComDatumapisNetworkingV1AlphaHttpProxy;

        if (!data) {
          throw new Error('Failed to create HTTP proxy');
        }

        // Return raw response for dryRun
        if (options?.dryRun) {
          return data;
        }

        const httpProxy = toHttpProxy(data);

        logger.service(SERVICE_NAME, 'create', {
          input: { projectId, name: input.name },
          duration: Date.now() - startTime,
        });

        return httpProxy;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Update an existing HTTP proxy
     */
    async update(
      projectId: string,
      name: string,
      input: UpdateHttpProxyInput,
      options?: ServiceOptions
    ): Promise<HttpProxy | ComDatumapisNetworkingV1AlphaHttpProxy> {
      const startTime = Date.now();

      try {
        const payload = toUpdateHttpProxyPayload(input);

        const response = await patchNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
          body: payload,
          query: {
            ...(options?.dryRun ? { dryRun: 'All' } : {}),
            fieldManager: 'datum-cloud-portal',
          },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });

        const data = response.data as ComDatumapisNetworkingV1AlphaHttpProxy;

        if (!data) {
          throw new Error('Failed to update HTTP proxy');
        }

        // Return raw response for dryRun
        if (options?.dryRun) {
          return data;
        }

        const httpProxy = toHttpProxy(data);

        logger.service(SERVICE_NAME, 'update', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return httpProxy;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Delete an HTTP proxy
     */
    async delete(projectId: string, name: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
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

export type HttpProxyService = ReturnType<typeof createHttpProxyService>;
