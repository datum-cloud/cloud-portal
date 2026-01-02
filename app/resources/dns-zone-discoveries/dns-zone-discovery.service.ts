import { toDnsZoneDiscovery, toCreateDnsZoneDiscoveryPayload } from './dns-zone-discovery.adapter';
import type { DnsZoneDiscovery } from './dns-zone-discovery.schema';
import {
  listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZoneDiscovery,
  readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZoneDiscovery,
  createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZoneDiscovery,
  type ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscoveryList,
  type ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery,
} from '@/modules/control-plane/dns-networking';
import { logger } from '@/modules/logger';
import type { ServiceContext, ServiceOptions } from '@/resources/base/types';
import { mapApiError } from '@/utils/errors/error-mapper';

export const dnsZoneDiscoveryKeys = {
  all: ['dns-zone-discoveries'] as const,
  lists: () => [...dnsZoneDiscoveryKeys.all, 'list'] as const,
  list: (projectId: string, dnsZoneId?: string) =>
    [...dnsZoneDiscoveryKeys.lists(), projectId, dnsZoneId ?? 'all'] as const,
  details: () => [...dnsZoneDiscoveryKeys.all, 'detail'] as const,
  detail: (projectId: string, id: string) =>
    [...dnsZoneDiscoveryKeys.details(), projectId, id] as const,
};

const SERVICE_NAME = 'DnsZoneDiscoveryService';

export function createDnsZoneDiscoveryService(ctx: ServiceContext) {
  const client = ctx.controlPlaneClient;

  const buildBaseUrl = (projectId: string) =>
    `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectId}/control-plane`;

  return {
    /**
     * List all DNS zone discoveries for a project
     */
    async list(
      projectId: string,
      dnsZoneId?: string,
      limit?: number,
      _options?: ServiceOptions
    ): Promise<DnsZoneDiscovery[]> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(projectId, dnsZoneId, limit);

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId, dnsZoneId, limit },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async fetchList(
      projectId: string,
      dnsZoneId?: string,
      limit?: number
    ): Promise<DnsZoneDiscovery[]> {
      const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZoneDiscovery({
        client,
        baseURL: buildBaseUrl(projectId),
        path: {
          namespace: 'default',
        },
        query: {
          fieldSelector: dnsZoneId ? `spec.dnsZoneRef.name=${dnsZoneId}` : undefined,
          limit,
        },
      });

      const data = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscoveryList;
      return data.items.map(toDnsZoneDiscovery);
    },

    /**
     * Get a single DNS zone discovery by ID
     */
    async get(projectId: string, id: string, _options?: ServiceOptions): Promise<DnsZoneDiscovery> {
      const startTime = Date.now();

      try {
        const result = await this.fetchOne(projectId, id);

        logger.service(SERVICE_NAME, 'get', {
          input: { projectId, id },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async fetchOne(projectId: string, id: string): Promise<DnsZoneDiscovery> {
      const response = await readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZoneDiscovery({
        client,
        baseURL: buildBaseUrl(projectId),
        path: {
          namespace: 'default',
          name: id,
        },
      });

      const data = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery;
      return toDnsZoneDiscovery(data);
    },

    /**
     * Create a new DNS zone discovery
     */
    async create(
      projectId: string,
      dnsZoneId: string,
      options?: ServiceOptions
    ): Promise<DnsZoneDiscovery | ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery> {
      const startTime = Date.now();

      try {
        const payload = toCreateDnsZoneDiscoveryPayload(dnsZoneId);

        const response = await createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZoneDiscovery({
          client,
          baseURL: buildBaseUrl(projectId),
          path: {
            namespace: 'default',
          },
          query: {
            dryRun: options?.dryRun ? 'All' : undefined,
          },
          headers: {
            'Content-Type': 'application/json',
          },
          body: payload,
        });

        const data = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery;

        // Return raw response for dryRun
        if (options?.dryRun) {
          return data;
        }

        const discovery = toDnsZoneDiscovery(data);

        // Invalidate list cache for the project

        logger.service(SERVICE_NAME, 'create', {
          input: { projectId, dnsZoneId },
          duration: Date.now() - startTime,
        });

        return discovery;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },
  };
}

export type DnsZoneDiscoveryService = ReturnType<typeof createDnsZoneDiscoveryService>;
