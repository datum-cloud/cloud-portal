import {
  ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet,
  ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList,
  createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
  listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
} from '@/modules/control-plane/dns-networking';
import {
  IDnsRecordSetControlResponse,
  IFlattenedDnsRecord,
} from '@/resources/interfaces/dns.interface';
import { flattenDnsRecordSets } from '@/utils/helpers/dns-record.helper';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
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
    create: async (projectId: string, dnsZoneId: string) => {
      const response = await createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
        query: {
          dryRun: 'All',
        },
        body: {
          kind: 'DNSRecordSet',
          apiVersion: 'dns.networking.miloapis.com/v1alpha1',
          metadata: {
            name: `dns-record-set-${generateId(dnsZoneId, { randomText: generateRandomString(6) })}`,
          },
          spec: {
            dnsZoneRef: { name: dnsZoneId },
            recordType: 'A',
            records: [
              {
                name: '@',
                a: {
                  content: ['192.168.1.1', '192.168.1.2'],
                },
                ttl: 3600,
              },
            ],
          },
        },
      });

      console.log(JSON.stringify(response.data, null, 2));

      const dnsRecordSet = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet;

      return transformDnsRecordSet(dnsRecordSet);
    },
  };
};
