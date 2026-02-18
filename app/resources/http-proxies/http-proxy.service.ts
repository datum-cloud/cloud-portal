import {
  toHttpProxy,
  toHttpProxyList,
  toCreateHttpProxyPayload,
  toUpdateHttpProxyPayload,
  toTrafficProtectionPolicyPayload,
  getTrafficProtectionMode,
  getParanoiaLevels,
  toTrafficProtectionModeMap,
  toParanoiaLevelsMap,
} from './http-proxy.adapter';
import type { HttpProxy, CreateHttpProxyInput, UpdateHttpProxyInput } from './http-proxy.schema';
import {
  listNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  listNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy,
  readNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  readNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy,
  createNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  createNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy,
  patchNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy,
  patchNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  deleteNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  deleteNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy,
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
      const baseURL = getProjectScopedBase(projectId);
      const path = { namespace: 'default' as const };

      const [proxyResponse, policyResponse] = await Promise.all([
        listNetworkingDatumapisComV1AlphaNamespacedHttpProxy({ baseURL, path, query }),
        listNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({ baseURL, path }),
      ]);

      const proxyData = proxyResponse.data as ComDatumapisNetworkingV1AlphaHttpProxyList;
      const modeMap = toTrafficProtectionModeMap(policyResponse.data);
      const paranoiaLevelsMap = toParanoiaLevelsMap(policyResponse.data);

      return toHttpProxyList(proxyData?.items ?? [], undefined, {
        trafficProtectionModeByName: modeMap,
        paranoiaLevelsByName: paranoiaLevelsMap,
      }).items;
    },

    async createTrafficProtectionPolicy(
      projectId: string,
      httpProxyName: string,
      mode: 'Observe' | 'Enforce' | 'Disabled' = 'Enforce',
      paranoiaLevels?: { blocking?: number; detection?: number }
    ): Promise<void> {
      const baseURL = getProjectScopedBase(projectId);
      const body = toTrafficProtectionPolicyPayload(httpProxyName, mode, paranoiaLevels);
      await createNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({
        baseURL,
        path: { namespace: 'default' },
        body,
      });
    },

    async deleteTrafficProtectionPolicy(projectId: string, name: string): Promise<void> {
      try {
        await deleteNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
        });
      } catch (error: unknown) {
        // Ignore 404 - policy may not exist for older proxies
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status !== 404) throw error;
      }
    },

    async updateTrafficProtectionPolicyMode(
      projectId: string,
      name: string,
      mode: any,
      paranoiaLevels?: { blocking?: number; detection?: number }
    ): Promise<void> {
      const baseURL = getProjectScopedBase(projectId);
      try {
        const specBody: {
          mode?: any;
          ruleSets?: Array<{
            type: 'OWASPCoreRuleSet';
            owaspCoreRuleSet?: {
              paranoiaLevels?: {
                blocking?: number;
                detection?: number;
              };
            };
          }>;
        } = { mode };

        if (
          paranoiaLevels &&
          (paranoiaLevels.blocking !== undefined || paranoiaLevels.detection !== undefined)
        ) {
          specBody.ruleSets = [
            {
              type: 'OWASPCoreRuleSet',
              owaspCoreRuleSet: {
                paranoiaLevels: {
                  ...(paranoiaLevels.blocking !== undefined && {
                    blocking: paranoiaLevels.blocking,
                  }),
                  ...(paranoiaLevels.detection !== undefined && {
                    detection: paranoiaLevels.detection,
                  }),
                },
              },
            },
          ];
        }

        await patchNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({
          baseURL,
          path: { namespace: 'default', name },
          // Merge patch updating spec.mode and/or paranoia levels
          body: { spec: specBody },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          // If policy doesn't exist (older proxy), create it instead
          await this.createTrafficProtectionPolicy(projectId, name, mode, paranoiaLevels);
        } else {
          throw error;
        }
      }
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
      const baseURL = getProjectScopedBase(projectId);
      const path = { namespace: 'default' as const, name };

      const [proxyResponse, policyResponse] = await Promise.all([
        readNetworkingDatumapisComV1AlphaNamespacedHttpProxy({ baseURL, path }),
        readNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({ baseURL, path }).catch(
          () => ({ data: null })
        ),
      ]);

      const data = proxyResponse.data as ComDatumapisNetworkingV1AlphaHttpProxy;

      if (!data) {
        throw new Error(`HTTP Proxy ${name} not found`);
      }

      const wafMode = getTrafficProtectionMode(policyResponse.data);
      const paranoiaLevels = getParanoiaLevels(policyResponse.data);
      return toHttpProxy(data, { trafficProtectionMode: wafMode, paranoiaLevels });
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

        // Attach WAF (OWASP Core Rule Set) to the proxy's Gateway
        try {
          await this.createTrafficProtectionPolicy(
            projectId,
            input.name,
            input.trafficProtectionMode ?? 'Enforce',
            input.paranoiaLevels
          );
        } catch (policyError) {
          logger.error(
            `${SERVICE_NAME}.createTrafficProtectionPolicy failed`,
            policyError as Error
          );
          // Proxy was created; surface policy error but don't fail the create
          throw mapApiError(policyError as Error);
        }

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

        // If WAF mode or paranoia levels were changed, update the TrafficProtectionPolicy
        if (input.trafficProtectionMode || input.paranoiaLevels) {
          try {
            await this.updateTrafficProtectionPolicyMode(
              projectId,
              name,
              input.trafficProtectionMode,
              input.paranoiaLevels
            );
          } catch (policyError) {
            logger.error(
              `${SERVICE_NAME}.updateTrafficProtectionPolicyMode failed`,
              policyError as Error
            );
            // Don't fail the proxy update if WAF update fails
          }
        }

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

        // Remove WAF policy linked to this proxy (same name); ignore if missing
        await this.deleteTrafficProtectionPolicy(projectId, name);

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
