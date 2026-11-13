import { createSecurityPolicyService } from './security-policy.service';
import { client } from '@/modules/control-plane/shared/client.gen';
import { getProjectScopedBase } from '@/resources/base/utils';
// File-level imports: the http-proxies index re-exports the proxy service,
// which composes this one, so importing the index here would be circular.
import {
  generateHtpasswd,
  parseHtpasswdHashes,
  toSecurityPolicyPayload,
} from '@/resources/http-proxies/http-proxy.adapter';
import type { BasicAuthUser } from '@/resources/http-proxies/http-proxy.schema';
import { getRelatedResourceErrorStatus } from '@/resources/http-proxies/related-resource';

const NAMESPACE = 'default';

/** Label that makes the gateway controller sync the Secret to the edge. */
const GATEWAY_SYNC_LABELS = { 'networking.datumapis.com/gateway-sync': '' };

const basicAuthSecretName = (proxyName: string) => `${proxyName}-basic-auth`;

function toHtpasswdBase64(htpasswd: string): string {
  return btoa(
    new TextEncoder().encode(htpasswd).reduce((acc, byte) => acc + String.fromCharCode(byte), '')
  );
}

/**
 * Basic auth for a proxy is two objects: an htpasswd Secret named
 * `{proxy}-basic-auth` and a SecurityPolicy named like the proxy that points
 * at it. Errors are thrown raw; the proxy service maps them.
 */
export function createBasicAuthService() {
  const securityPolicies = createSecurityPolicyService();

  /** Ensure the SecurityPolicy exists (idempotent — ignore 409 Conflict). */
  const ensureSecurityPolicy = async (baseURL: string, proxyName: string): Promise<void> => {
    try {
      await securityPolicies.create(baseURL, NAMESPACE, toSecurityPolicyPayload(proxyName));
    } catch (error: unknown) {
      if (getRelatedResourceErrorStatus(error) !== 409) throw error;
    }
  };

  return {
    /** GET the htpasswd Secret for a proxy; a missing Secret rejects with a 404. */
    async readSecret(
      baseURL: string,
      namespace: string,
      proxyName: string
    ): Promise<{ data: unknown }> {
      return client.get({
        url: `/api/v1/namespaces/${namespace}/secrets/${basicAuthSecretName(proxyName)}`,
        baseURL,
      }) as Promise<{ data: unknown }>;
    },

    /**
     * Create the htpasswd Secret and SecurityPolicy for a proxy.
     * Used when enabling basic auth for the first time.
     */
    async create(projectId: string, proxyName: string, users: BasicAuthUser[]): Promise<void> {
      const baseURL = getProjectScopedBase(projectId);
      const htpasswdBase64 = toHtpasswdBase64(await generateHtpasswd(users));

      await client.post({
        url: `/api/v1/namespaces/${NAMESPACE}/secrets`,
        baseURL,
        body: {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: basicAuthSecretName(proxyName),
            labels: GATEWAY_SYNC_LABELS,
          },
          type: 'Opaque',
          data: { '.htpasswd': htpasswdBase64 },
        },
        headers: { 'Content-Type': 'application/json' },
      });

      await ensureSecurityPolicy(baseURL, proxyName);
    },

    /**
     * Update the htpasswd Secret with new credentials.
     * Users submitted without a password keep their stored hash.
     * The SecurityPolicy itself does not need to change.
     * Falls back to create if the Secret or SecurityPolicy don't exist yet.
     */
    async update(projectId: string, proxyName: string, users: BasicAuthUser[]): Promise<void> {
      const baseURL = getProjectScopedBase(projectId);
      let existingHashes = new Map<string, string>();
      if (users.some((u) => !u.password)) {
        try {
          const { data } = await this.readSecret(baseURL, NAMESPACE, proxyName);
          existingHashes = parseHtpasswdHashes(data);
        } catch (error: unknown) {
          // No Secret yet: generateHtpasswd reports which users need a password.
          if (getRelatedResourceErrorStatus(error) !== 404) throw error;
        }
      }
      const htpasswdBase64 = toHtpasswdBase64(await generateHtpasswd(users, existingHashes));

      try {
        await client.patch({
          url: `/api/v1/namespaces/${NAMESPACE}/secrets/${basicAuthSecretName(proxyName)}`,
          baseURL,
          body: {
            metadata: { labels: GATEWAY_SYNC_LABELS },
            data: { '.htpasswd': htpasswdBase64 },
          },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });
      } catch (error: unknown) {
        if (getRelatedResourceErrorStatus(error) === 404) {
          // Secret doesn't exist yet — create everything from scratch
          await this.create(projectId, proxyName, users);
          return;
        }
        throw error;
      }

      await ensureSecurityPolicy(baseURL, proxyName);
    },

    /**
     * Delete the SecurityPolicy and htpasswd Secret for a proxy.
     * Both 404 responses are silently ignored.
     */
    async delete(projectId: string, proxyName: string): Promise<void> {
      const baseURL = getProjectScopedBase(projectId);

      await securityPolicies.delete(baseURL, NAMESPACE, proxyName);

      try {
        await client.delete({
          url: `/api/v1/namespaces/${NAMESPACE}/secrets/${basicAuthSecretName(proxyName)}`,
          baseURL,
        });
      } catch (error: unknown) {
        if (getRelatedResourceErrorStatus(error) !== 404) throw error;
      }
    },
  };
}

export type BasicAuthService = ReturnType<typeof createBasicAuthService>;
