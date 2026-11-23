import { client } from '@/modules/control-plane/shared/client.gen';
import { getRelatedResourceErrorStatus } from '@/resources/http-proxies/related-resource';

/**
 * Envoy Gateway SecurityPolicy has no generated client, so these go through the
 * shared control-plane client by URL. Errors are thrown raw: the proxy service
 * composes these calls and decides which statuses degrade and which are mapped.
 */
const securityPoliciesUrl = (namespace: string) =>
  `/apis/gateway.envoyproxy.io/v1alpha1/namespaces/${namespace}/securitypolicies`;

export function createSecurityPolicyService() {
  return {
    /** LIST SecurityPolicies in a namespace. */
    async list(
      baseURL: string,
      namespace: string
    ): Promise<{ data: { items?: unknown[] } | null }> {
      return client.get({
        url: securityPoliciesUrl(namespace),
        baseURL,
      }) as Promise<{ data: { items?: unknown[] } | null }>;
    },

    /** GET a SecurityPolicy by name; a missing policy rejects with a 404. */
    async read(baseURL: string, namespace: string, name: string): Promise<{ data: unknown }> {
      return client.get({
        url: `${securityPoliciesUrl(namespace)}/${name}`,
        baseURL,
      }) as Promise<{ data: unknown }>;
    },

    /** POST a new SecurityPolicy. */
    async create(baseURL: string, namespace: string, body: object): Promise<void> {
      await client.post({
        url: securityPoliciesUrl(namespace),
        baseURL,
        body,
        headers: { 'Content-Type': 'application/json' },
      });
    },

    /** DELETE a SecurityPolicy; ignores 404. */
    async delete(baseURL: string, namespace: string, name: string): Promise<void> {
      try {
        await client.delete({
          url: `${securityPoliciesUrl(namespace)}/${name}`,
          baseURL,
        });
      } catch (error: unknown) {
        if (getRelatedResourceErrorStatus(error) !== 404) throw error;
      }
    },
  };
}

export type SecurityPolicyService = ReturnType<typeof createSecurityPolicyService>;
