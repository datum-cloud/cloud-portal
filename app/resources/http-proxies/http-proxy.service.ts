import {
  toHttpProxy,
  toHttpProxyList,
  toCreateHttpProxyPayload,
  toUpdateHttpProxyPayload,
  httpProxyPatchTouchesResource,
  getBasicAuthState,
  parseHtpasswdUsernames,
} from './http-proxy.adapter';
import type { HttpProxy, CreateHttpProxyInput, UpdateHttpProxyInput } from './http-proxy.schema';
import { getRelatedResourceErrorStatus, resolveRelatedResource } from './related-resource';
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
import { createBasicAuthService } from '@/resources/security-policies/basic-auth.service';
import { createSecurityPolicyService } from '@/resources/security-policies/security-policy.service';
import { createServiceEntitlementService } from '@/resources/service-entitlements';
import { createTrafficProtectionPolicyService } from '@/resources/traffic-protection-policies/traffic-protection-policy.service';
import { NotFoundError } from '@/utils/errors';
import { mapApiError } from '@/utils/errors/error-mapper';

/** Sync-state kind of HTTPProxy rows: the list's row keys, its watch, and its mutations. */
export const HTTP_PROXY_SYNC_KIND = 'http-proxies';

export const httpProxyKeys = {
  all: ['http-proxies'] as const,
  lists: () => [...httpProxyKeys.all, 'list'] as const,
  list: (projectId: string) => [...httpProxyKeys.lists(), projectId] as const,
  details: () => [...httpProxyKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) =>
    [...httpProxyKeys.details(), projectId, name] as const,
};

const SERVICE_NAME = 'HttpProxyService';

/**
 * HTTPProxy CRUD. A proxy owns three sibling objects, each with its own
 * resource module: a TrafficProtectionPolicy (WAF), a SecurityPolicy and an
 * htpasswd Secret (basic auth). This service only composes them where a proxy
 * read or write has to cascade.
 */
export function createHttpProxyService() {
  const trafficProtection = createTrafficProtectionPolicyService();
  const securityPolicies = createSecurityPolicyService();
  const basicAuth = createBasicAuthService();

  return {
    /** Extract HTTP status from an error (AppError from interceptor, or AxiosError). */
    getErrorStatus(error: unknown): number | undefined {
      return getRelatedResourceErrorStatus(error);
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

      // WAF (TrafficProtectionPolicy) is intentionally NOT fetched here — it is
      // loaded by a separate permission-gated query (useTrafficProtectionPolicies)
      // so users without trafficprotectionpolicies access never trigger that request.
      // SecurityPolicies are a related resource: 404/403/failed reads degrade to
      // "no basic auth info", never fail the proxy list (#1378).
      const [proxyResponse, securityPoliciesResult] = await Promise.all([
        listNetworkingDatumapisComV1AlphaNamespacedHttpProxy({ baseURL, path, query }),
        resolveRelatedResource(async () => (await securityPolicies.list(baseURL, 'default')).data, {
          onUnexpected: 'absorb',
        }),
      ]);

      const proxyData = proxyResponse.data as ComDatumapisNetworkingV1AlphaHttpProxyList;

      const basicAuthByName = new Map<
        string,
        { enabled: boolean; userCount: number; usernames: string[] }
      >();
      const securityPolicyItems = securityPoliciesResult.data?.items ?? [];
      for (const sp of securityPolicyItems) {
        const spName = (sp as { metadata?: { name?: string } })?.metadata?.name;
        if (spName) {
          basicAuthByName.set(spName, getBasicAuthState(sp));
        }
      }

      return toHttpProxyList(proxyData?.items ?? [], undefined, {
        basicAuthByName,
      }).items;
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

      // WAF (TrafficProtectionPolicy) is intentionally NOT fetched here — it is
      // loaded by a separate permission-gated query (useTrafficProtectionPolicy).
      // SecurityPolicy and the htpasswd Secret are related resources: 404 renders
      // the "not configured" state, 403 an insufficient-permissions state, and no
      // failure here may take down the proxy page (#1378).
      const [proxyResponse, securityPolicyResult, secretResult] = await Promise.all([
        readNetworkingDatumapisComV1AlphaNamespacedHttpProxy({ baseURL, path }),
        resolveRelatedResource(
          async () => (await securityPolicies.read(baseURL, 'default', name)).data,
          { onUnexpected: 'absorb' }
        ),
        resolveRelatedResource(
          async () => (await basicAuth.readSecret(baseURL, 'default', name)).data,
          { onUnexpected: 'absorb' }
        ),
      ]);

      const data = proxyResponse.data as ComDatumapisNetworkingV1AlphaHttpProxy;

      if (!data) {
        throw new NotFoundError('Application Load Balancer', name);
      }

      const usernames = parseHtpasswdUsernames(secretResult.data);
      const basicAuthState = getBasicAuthState(securityPolicyResult.data, usernames);
      const basicAuthForbidden =
        securityPolicyResult.state === 'forbidden' || secretResult.state === 'forbidden';
      return toHttpProxy(data, {
        basicAuth: { ...basicAuthState, ...(basicAuthForbidden && { forbidden: true }) },
      });
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
        if (!options?.dryRun) {
          await createServiceEntitlementService().ensure(projectId);
        }

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
          await trafficProtection.createForProxy(
            projectId,
            input.name,
            input.trafficProtectionMode ?? 'Enforce',
            input.paranoiaLevels,
            input.ruleExclusions
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
        const touchesProxy = httpProxyPatchTouchesResource(payload);
        const touchesWaf =
          !!input.removeTrafficProtection ||
          input.trafficProtectionMode !== undefined ||
          input.paranoiaLevels !== undefined ||
          input.ruleExclusions !== undefined;

        let httpProxy: HttpProxy;

        if (touchesProxy) {
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

          if (options?.dryRun) {
            return data;
          }

          httpProxy = toHttpProxy(data);
        } else {
          // Protection / basic-auth only: skip the empty HTTPProxy merge-patch
          // ({apiVersion,kind}) that otherwise returns 200 with no object change.
          httpProxy = options?.currentProxy ?? (await this.fetchOne(projectId, name));
          if (options?.dryRun) {
            return httpProxy;
          }
        }

        // If WAF should be removed, delete the TrafficProtectionPolicy.
        // Must complete before returning so onSuccess/refetch doesn't race with stale data.
        if (input.removeTrafficProtection) {
          try {
            await trafficProtection.deleteForProxy(projectId, name);
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
        else if (
          input.trafficProtectionMode ||
          input.paranoiaLevels ||
          input.ruleExclusions !== undefined
        ) {
          try {
            await trafficProtection.updateForProxy(
              projectId,
              name,
              input.trafficProtectionMode,
              input.paranoiaLevels,
              input.ruleExclusions
            );
          } catch (policyError) {
            logger.error(
              `${SERVICE_NAME}.updateTrafficProtectionPolicyMode failed`,
              policyError as Error
            );
            // When the only write was WAF, surface the failure. If the proxy
            // patch already succeeded, keep the prior soft-fail behavior.
            if (!touchesProxy && touchesWaf) {
              throw mapApiError(policyError);
            }
          }
        }

        // Handle basic auth changes
        if (input.basicAuth !== undefined) {
          try {
            if (!input.basicAuth.users || input.basicAuth.users.length === 0) {
              await basicAuth.delete(projectId, name);
            } else {
              await basicAuth.update(projectId, name, input.basicAuth.users);
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
        await trafficProtection.deleteForProxy(projectId, name);

        // Remove basic auth SecurityPolicy + Secret linked to this proxy; ignore if missing
        await basicAuth.delete(projectId, name);

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
