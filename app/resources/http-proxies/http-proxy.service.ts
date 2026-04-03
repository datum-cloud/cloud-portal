import {
  toHttpProxy,
  toHttpProxyList,
  toCreateHttpProxyPayload,
  toUpdateHttpProxyPayload,
  toTrafficProtectionPolicyPayload,
  toSecurityPolicyPayload,
  getTrafficProtectionMode,
  getParanoiaLevels,
  getBasicAuthState,
  parseHtpasswdUsernames,
  generateHtpasswd,
  toTrafficProtectionModeMap,
  toParanoiaLevelsMap,
} from './http-proxy.adapter';
import type {
  HttpProxy,
  CreateHttpProxyInput,
  UpdateHttpProxyInput,
  TrafficProtectionMode,
  BasicAuthUser,
} from './http-proxy.schema';
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
import { client } from '@/modules/control-plane/shared/client.gen';
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
    /** Extract HTTP status from an error (AppError from interceptor, or AxiosError). */
    getErrorStatus(error: unknown): number | undefined {
      const e = error as { status?: number; response?: { status?: number } };
      return e?.status ?? e?.response?.status;
    },

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

      const [proxyResponse, policyResponse, securityPoliciesResponse] = await Promise.all([
        listNetworkingDatumapisComV1AlphaNamespacedHttpProxy({ baseURL, path, query }),
        listNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({ baseURL, path }),
        this.listSecurityPolicies(baseURL, 'default').catch(() => ({ data: null })),
      ]);

      const proxyData = proxyResponse.data as ComDatumapisNetworkingV1AlphaHttpProxyList;
      const modeMap = toTrafficProtectionModeMap(policyResponse.data);
      const paranoiaLevelsMap = toParanoiaLevelsMap(policyResponse.data);

      const basicAuthByName = new Map<
        string,
        { enabled: boolean; userCount: number; usernames: string[] }
      >();
      const securityPolicyItems =
        (securityPoliciesResponse.data as { items?: unknown[] } | null)?.items ?? [];
      for (const sp of securityPolicyItems) {
        const spName = (sp as { metadata?: { name?: string } })?.metadata?.name;
        if (spName) {
          basicAuthByName.set(spName, getBasicAuthState(sp));
        }
      }

      return toHttpProxyList(proxyData?.items ?? [], undefined, {
        trafficProtectionModeByName: modeMap,
        paranoiaLevelsByName: paranoiaLevelsMap,
        basicAuthByName,
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

    /** GET a SecurityPolicy by name; returns { data: null } on 404. */
    async readSecurityPolicy(
      baseURL: string,
      namespace: string,
      name: string
    ): Promise<{ data: unknown }> {
      return client.get({
        url: `/apis/gateway.envoyproxy.io/v1alpha1/namespaces/${namespace}/securitypolicies/${name}`,
        baseURL,
      }) as Promise<{ data: unknown }>;
    },

    /** POST a new SecurityPolicy. */
    async callSecurityPolicyCreate(
      baseURL: string,
      namespace: string,
      body: object
    ): Promise<void> {
      await client.post({
        url: `/apis/gateway.envoyproxy.io/v1alpha1/namespaces/${namespace}/securitypolicies`,
        baseURL,
        body,
        headers: { 'Content-Type': 'application/json' },
      });
    },

    /** DELETE a SecurityPolicy; ignores 404. */
    async callSecurityPolicyDelete(
      baseURL: string,
      namespace: string,
      name: string
    ): Promise<void> {
      try {
        await client.delete({
          url: `/apis/gateway.envoyproxy.io/v1alpha1/namespaces/${namespace}/securitypolicies/${name}`,
          baseURL,
        });
      } catch (error: unknown) {
        if (this.getErrorStatus(error) !== 404) throw error;
      }
    },

    /** GET the htpasswd Secret for a proxy; returns { data: null } on 404. */
    async readBasicAuthSecret(
      baseURL: string,
      namespace: string,
      name: string
    ): Promise<{ data: unknown }> {
      return client.get({
        url: `/api/v1/namespaces/${namespace}/secrets/${name}-basic-auth`,
        baseURL,
      }) as Promise<{ data: unknown }>;
    },

    /** LIST SecurityPolicies in a namespace. */
    async listSecurityPolicies(
      baseURL: string,
      namespace: string
    ): Promise<{ data: { items?: unknown[] } | null }> {
      return client.get({
        url: `/apis/gateway.envoyproxy.io/v1alpha1/namespaces/${namespace}/securitypolicies`,
        baseURL,
      }) as Promise<{ data: { items?: unknown[] } | null }>;
    },

    /**
     * Create the htpasswd Secret and SecurityPolicy for a proxy.
     * Used when enabling basic auth for the first time.
     */
    async createBasicAuth(
      projectId: string,
      httpProxyName: string,
      users: BasicAuthUser[]
    ): Promise<void> {
      const baseURL = getProjectScopedBase(projectId);
      const htpasswd = await generateHtpasswd(users);
      const htpasswdBase64 = btoa(
        new TextEncoder()
          .encode(htpasswd)
          .reduce((acc, byte) => acc + String.fromCharCode(byte), '')
      );

      await client.post({
        url: `/api/v1/namespaces/default/secrets`,
        baseURL,
        body: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: `${httpProxyName}-basic-auth`,
            labels: { 'networking.datumapis.com/gateway-sync': '' },
          },
          type: 'Opaque',
          data: { '.htpasswd': htpasswdBase64 },
        },
        headers: { 'Content-Type': 'application/json' },
      });

      try {
        await this.callSecurityPolicyCreate(
          baseURL,
          'default',
          toSecurityPolicyPayload(httpProxyName)
        );
      } catch (error: unknown) {
        if (this.getErrorStatus(error) !== 409) throw error;
      }
    },

    /**
     * Update the htpasswd Secret with new credentials.
     * The SecurityPolicy itself does not need to change.
     * Falls back to createBasicAuth if the Secret or SecurityPolicy don't exist yet.
     */
    async updateBasicAuth(
      projectId: string,
      httpProxyName: string,
      users: BasicAuthUser[]
    ): Promise<void> {
      const baseURL = getProjectScopedBase(projectId);
      const htpasswd = await generateHtpasswd(users);
      const htpasswdBase64 = btoa(
        new TextEncoder()
          .encode(htpasswd)
          .reduce((acc, byte) => acc + String.fromCharCode(byte), '')
      );

      try {
        await client.patch({
          url: `/api/v1/namespaces/default/secrets/${httpProxyName}-basic-auth`,
          baseURL,
          body: {
            metadata: {
              labels: { 'networking.datumapis.com/gateway-sync': '' },
            },
            data: { '.htpasswd': htpasswdBase64 },
          },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });
      } catch (error: unknown) {
        if (this.getErrorStatus(error) === 404) {
          // Secret doesn't exist yet — create everything from scratch
          await this.createBasicAuth(projectId, httpProxyName, users);
          return;
        }
        throw error;
      }

      // Ensure SecurityPolicy exists (idempotent — ignore 409 Conflict)
      try {
        await this.callSecurityPolicyCreate(
          baseURL,
          'default',
          toSecurityPolicyPayload(httpProxyName)
        );
      } catch (error: unknown) {
        if (this.getErrorStatus(error) !== 409) throw error;
      }
    },

    /**
     * Delete the SecurityPolicy and htpasswd Secret for a proxy.
     * Both 404 responses are silently ignored.
     */
    async deleteBasicAuth(projectId: string, name: string): Promise<void> {
      const baseURL = getProjectScopedBase(projectId);

      await this.callSecurityPolicyDelete(baseURL, 'default', name);

      try {
        await client.delete({
          url: `/api/v1/namespaces/default/secrets/${name}-basic-auth`,
          baseURL,
        });
      } catch (error: unknown) {
        if (this.getErrorStatus(error) !== 404) throw error;
      }
    },

    async deleteTrafficProtectionPolicy(projectId: string, name: string): Promise<void> {
      try {
        await deleteNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
        });
      } catch (error: unknown) {
        const status =
          (error as { status?: number })?.status ??
          (error as { response?: { status?: number } })?.response?.status;
        if (status !== 404) throw error;
      }
    },

    async updateTrafficProtectionPolicyMode(
      projectId: string,
      name: string,
      mode: TrafficProtectionMode,
      paranoiaLevels?: { blocking?: number; detection?: number }
    ): Promise<void> {
      const baseURL = getProjectScopedBase(projectId);

      const specBody: {
        mode?: TrafficProtectionMode;
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

      try {
        await patchNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({
          baseURL,
          path: { namespace: 'default', name },
          body: { spec: specBody },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });
      } catch (error: unknown) {
        if (this.getErrorStatus(error) === 404) {
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

      const [proxyResponse, policyResponse, securityPolicyResponse, secretResponse] =
        await Promise.all([
          readNetworkingDatumapisComV1AlphaNamespacedHttpProxy({ baseURL, path }),
          readNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({
            baseURL,
            path,
          }).catch(() => ({ data: null })),
          this.readSecurityPolicy(baseURL, 'default', name).catch(() => ({ data: null })),
          this.readBasicAuthSecret(baseURL, 'default', name).catch(() => ({ data: null })),
        ]);

      const data = proxyResponse.data as ComDatumapisNetworkingV1AlphaHttpProxy;

      if (!data) {
        throw new Error(`HTTP Proxy ${name} not found`);
      }

      const wafMode = getTrafficProtectionMode(policyResponse.data);
      const paranoiaLevels = getParanoiaLevels(policyResponse.data);
      const usernames = parseHtpasswdUsernames(secretResponse.data);
      const basicAuth = getBasicAuthState(securityPolicyResponse.data, usernames);
      return toHttpProxy(data, { trafficProtectionMode: wafMode, paranoiaLevels, basicAuth });
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
      options?: ServiceOptions & { currentProxy?: HttpProxy }
    ): Promise<HttpProxy | ComDatumapisNetworkingV1AlphaHttpProxy> {
      const startTime = Date.now();

      try {
        const payload = toUpdateHttpProxyPayload(input, options?.currentProxy);

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

        // If WAF should be removed, delete the TrafficProtectionPolicy.
        // Must complete before returning so onSuccess/refetch doesn't race with stale data.
        if (input.removeTrafficProtection) {
          try {
            await this.deleteTrafficProtectionPolicy(projectId, name);
          } catch (policyError) {
            if (this.getErrorStatus(policyError) !== 404) {
              logger.error(
                `${SERVICE_NAME}.deleteTrafficProtectionPolicy failed`,
                policyError as Error
              );
              throw mapApiError(policyError);
            }
            // 404: policy already gone — idempotent, no-op
          }
        }
        // If WAF mode or paranoia levels were changed, update the TrafficProtectionPolicy
        else if (input.trafficProtectionMode || input.paranoiaLevels) {
          try {
            await this.updateTrafficProtectionPolicyMode(
              projectId,
              name,
              input.trafficProtectionMode!,
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

        // Handle basic auth changes
        if (input.basicAuth !== undefined) {
          try {
            if (!input.basicAuth.users || input.basicAuth.users.length === 0) {
              await this.deleteBasicAuth(projectId, name);
            } else {
              await this.updateBasicAuth(projectId, name, input.basicAuth.users);
            }
          } catch (basicAuthError) {
            logger.error(`${SERVICE_NAME}.basicAuth update failed`, basicAuthError as Error);
            throw mapApiError(basicAuthError);
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

        // Remove basic auth SecurityPolicy + Secret linked to this proxy; ignore if missing
        await this.deleteBasicAuth(projectId, name);

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
