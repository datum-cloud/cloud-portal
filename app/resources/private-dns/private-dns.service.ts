import { toDnsResolverContext, toDnsZoneAssociation } from './private-dns.adapter';
import type { DnsResolverContext, DnsZoneAssociation } from './private-dns.schema';
import { client } from '@/modules/control-plane/shared/client.gen';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const privateDnsKeys = {
  all: ['private-dns'] as const,
  associations: (projectId: string) => [...privateDnsKeys.all, 'associations', projectId] as const,
  contexts: (projectId: string) => [...privateDnsKeys.all, 'contexts', projectId] as const,
};

const SERVICE_NAME = 'PrivateDnsService';
const API_PREFIX = '/apis/dns.networking.miloapis.com/v1alpha1/namespaces/default';
const LIST_PAGE_SIZE = 500;
const LIST_PAGE_CAP = 20;

interface RawList {
  items?: unknown[];
  metadata?: { continue?: string };
}

/**
 * Read access to the Private DNS links between zones and VPCs. The generated
 * dns-networking client predates these kinds, so calls go through the shared
 * client directly.
 */
export function createPrivateDnsService() {
  async function listAll(projectId: string, plural: string): Promise<unknown[]> {
    const items: unknown[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < LIST_PAGE_CAP; page += 1) {
      const response = (await client.get({
        url: `${API_PREFIX}/${plural}`,
        baseURL: getProjectScopedBase(projectId),
        query: { limit: LIST_PAGE_SIZE, ...(cursor ? { continue: cursor } : {}) },
      })) as { data?: RawList };
      items.push(...(response.data?.items ?? []));
      cursor = response.data?.metadata?.continue || undefined;
      if (!cursor) break;
    }
    return items;
  }

  return {
    async listAssociations(projectId: string): Promise<DnsZoneAssociation[]> {
      const startTime = Date.now();
      try {
        const items = await listAll(projectId, 'dnszoneassociations');
        logger.service(SERVICE_NAME, 'listAssociations', {
          input: { projectId, count: items.length },
          duration: Date.now() - startTime,
        });
        return items.map((item) => toDnsZoneAssociation(item as never));
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listAssociations failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async listContexts(projectId: string): Promise<DnsResolverContext[]> {
      const startTime = Date.now();
      try {
        const items = await listAll(projectId, 'dnsresolvercontexts');
        logger.service(SERVICE_NAME, 'listContexts', {
          input: { projectId, count: items.length },
          duration: Date.now() - startTime,
        });
        return items.map((item) => toDnsResolverContext(item as never));
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listContexts failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type PrivateDnsService = ReturnType<typeof createPrivateDnsService>;
