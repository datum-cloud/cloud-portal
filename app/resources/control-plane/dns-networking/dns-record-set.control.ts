import {
  ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet,
  ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList,
  listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
} from '@/modules/control-plane/dns-networking';
import { IDnsRecordSetControlResponse } from '@/resources/interfaces/dns.interface';
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
    list: async (projectId: string, dnsZoneId?: string, limit?: number) => {
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
  };
};
