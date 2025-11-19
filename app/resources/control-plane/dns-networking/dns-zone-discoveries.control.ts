import {
  ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery,
  ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscoveryList,
  createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZoneDiscovery,
  listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZoneDiscovery,
  readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZoneDiscovery,
} from '@/modules/control-plane/dns-networking';
import { IDnsZoneDiscoveryControlResponse } from '@/resources/interfaces/dns.interface';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
import { Client } from '@hey-api/client-axios';

export const createDnsZoneDiscoveriesControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  /**
   * Transform DNSZoneDiscovery to IDnsZoneDiscoveryControlResponse
   */
  const transformDnsZoneDiscovery = (
    dnsZoneDiscovery: ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery
  ): IDnsZoneDiscoveryControlResponse => {
    const { metadata } = dnsZoneDiscovery;
    return {
      name: metadata?.name ?? '',
      createdAt: metadata?.creationTimestamp ?? new Date(),
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      recordSets: dnsZoneDiscovery.status?.recordSets,
    };
  };

  return {
    list: async (
      projectId: string,
      dnsZoneId?: string,
      limit?: number
    ): Promise<IDnsZoneDiscoveryControlResponse[]> => {
      const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZoneDiscovery({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
        query: {
          fieldSelector: dnsZoneId ? `spec.dnsZoneRef.name=${dnsZoneId}` : undefined,
          limit: limit,
        },
      });

      const dnsZoneDiscoveries =
        response.data as ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscoveryList;
      const zoneDiscoveries = dnsZoneDiscoveries.items.map(transformDnsZoneDiscovery);

      return zoneDiscoveries;
    },
    /**
     * Get single DNSZoneDiscovery by ID
     */
    detail: async (
      projectId: string,
      dnsZoneDiscoveryId: string
    ): Promise<IDnsZoneDiscoveryControlResponse> => {
      const response = await readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZoneDiscovery({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
          name: dnsZoneDiscoveryId,
        },
      });

      const dnsZoneDiscovery = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery;
      return transformDnsZoneDiscovery(dnsZoneDiscovery);
    },

    /**
     * Create new DNSZoneDiscovery
     */
    create: async (
      projectId: string,
      dnsZoneId: string,
      dryRun: boolean = false
    ): Promise<IDnsZoneDiscoveryControlResponse> => {
      const response = await createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZoneDiscovery({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          kind: 'DNSZoneDiscovery',
          apiVersion: 'dns.networking.miloapis.com/v1alpha1',
          metadata: {
            name: `dns-zone-discovery-${generateId(dnsZoneId, { randomText: generateRandomString(6) })}`,
          },
          spec: {
            dnsZoneRef: {
              name: dnsZoneId,
            },
          },
        },
      });

      const dnsZoneDiscovery = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery;
      return transformDnsZoneDiscovery(dnsZoneDiscovery);
    },
  };
};

export type DnsZoneDiscoveriesControl = ReturnType<typeof createDnsZoneDiscoveriesControl>;
