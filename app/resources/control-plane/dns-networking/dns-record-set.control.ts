import {
  ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet,
  ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList,
  createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
  deleteDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
  listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
  patchDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
  readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
  readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSetStatus,
} from '@/modules/control-plane/dns-networking';
import {
  IDnsRecordSetControlResponse,
  IFlattenedDnsRecord,
} from '@/resources/interfaces/dns.interface';
import { flattenDnsRecordSets } from '@/utils/helpers/dns-record.helper';
import { Client } from '@hey-api/client-axios';

export const createDnsRecordSetsControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformDnsRecordSet = (
    dnsRecordSet: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet
  ): IDnsRecordSetControlResponse => {
    const { metadata, spec, status } = dnsRecordSet;
    return {
      name: metadata?.name ?? '',
      createdAt: metadata?.creationTimestamp ?? new Date(),
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      dnsZoneId: spec?.dnsZoneRef?.name ?? '',
      recordType: spec?.recordType ?? '',
      records: spec?.records ?? [],
      status: status,
    };
  };

  return {
    list: async (
      projectId: string,
      dnsZoneId?: string,
      limit?: number
    ): Promise<IFlattenedDnsRecord[]> => {
      const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
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

      const dnsRecordSets = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList;
      const recordSets = dnsRecordSets.items.map(transformDnsRecordSet);

      return flattenDnsRecordSets(recordSets);
    },
    /**
     * Get RecordSets list (raw, not flattened)
     */
    listRaw: async (
      projectId: string,
      dnsZoneId?: string,
      limit?: number
    ): Promise<IDnsRecordSetControlResponse[]> => {
      const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
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

      const dnsRecordSets = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList;
      return dnsRecordSets.items.map(transformDnsRecordSet);
    },

    /**
     * Get single RecordSet by ID
     */
    detail: async (
      projectId: string,
      recordSetId: string
    ): Promise<IDnsRecordSetControlResponse> => {
      const response = await readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
          name: recordSetId,
        },
      });

      const dnsRecordSet = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet;
      return transformDnsRecordSet(dnsRecordSet);
    },

    /**
     * Create new RecordSet
     */
    create: async (
      projectId: string,
      payload: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec'],
      dryRun: boolean = false
    ): Promise<IDnsRecordSetControlResponse> => {
      const dnsZoneId = payload.dnsZoneRef?.name || '';
      const response = await createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
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
          kind: 'DNSRecordSet',
          apiVersion: 'dns.networking.miloapis.com/v1alpha1',
          metadata: {
            // name: `dns-record-set-${generateId(dnsZoneId, { randomText: generateRandomString(6) })}`,
            name: `${dnsZoneId}-${payload.recordType}`,
          },
          spec: payload,
        },
      });

      const dnsRecordSet = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet;
      return transformDnsRecordSet(dnsRecordSet);
    },

    /**
     * Update existing RecordSet (merge patch)
     */
    update: async (
      projectId: string,
      recordSetId: string,
      payload: Partial<ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec']>,
      dryRun: boolean = false
    ): Promise<IDnsRecordSetControlResponse> => {
      const response = await patchDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
          name: recordSetId,
        },
        query: {
          dryRun: dryRun ? 'All' : undefined,
          fieldManager: 'datum-cloud-portal',
        },
        headers: {
          'Content-Type': 'application/merge-patch+json',
        },
        body: {
          kind: 'DNSRecordSet',
          apiVersion: 'dns.networking.miloapis.com/v1alpha1',
          spec: payload,
        },
      });

      const dnsRecordSet = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet;
      return transformDnsRecordSet(dnsRecordSet);
    },

    /**
     * Delete RecordSet
     */
    delete: async (projectId: string, recordSetId: string) => {
      const response = await deleteDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
          name: recordSetId,
        },
      });

      return response.data;
    },

    /**
     * Find RecordSet by zone and type
     */
    findByTypeAndZone: async (
      projectId: string,
      dnsZoneId: string,
      recordType: string
    ): Promise<IDnsRecordSetControlResponse | undefined> => {
      const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
        query: {
          fieldSelector: `spec.dnsZoneRef.name=${dnsZoneId},spec.recordType=${recordType}`,
        },
      });

      const dnsRecordSets = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList;
      const items = dnsRecordSets.items.map(transformDnsRecordSet);
      return items.length > 0 ? items[0] : undefined;
    },

    /**
     * Get status of a DNS Record Set
     */
    getStatus: async (
      projectId: string,
      recordSetId: string
    ): Promise<ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['status']> => {
      try {
        const response = await readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSetStatus({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: recordSetId },
        });

        const dnsRecordSet = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet;

        return dnsRecordSet.status;
      } catch (e) {
        throw e;
      }
    },
  };
};

export type DnsRecordSetsControl = ReturnType<typeof createDnsRecordSetsControl>;
