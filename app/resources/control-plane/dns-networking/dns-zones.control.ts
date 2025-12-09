import {
  ComMiloapisNetworkingDnsV1Alpha1DnsZone,
  ComMiloapisNetworkingDnsV1Alpha1DnsZoneList,
  createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone,
  deleteDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone,
  listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone,
  patchDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone,
  readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone,
} from '@/modules/control-plane/dns-networking';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { FormDnsZoneSchema } from '@/resources/schemas/dns-zone.schema';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
import { Client } from '@hey-api/client-axios';

export const createDnsZonesControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformDnsZone = (
    dnsZone: ComMiloapisNetworkingDnsV1Alpha1DnsZone
  ): IDnsZoneControlResponse => {
    const { metadata, spec, status } = dnsZone;
    return {
      name: metadata?.name ?? '',
      createdAt: metadata?.creationTimestamp ?? new Date(),
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      namespace: metadata?.namespace ?? '',
      dnsZoneClassName: spec?.dnsZoneClassName ?? '',
      domainName: spec?.domainName ?? '',
      description: metadata?.annotations?.['kubernetes.io/description'] ?? '',
      status: status,
      deletionTimestamp: metadata?.deletionTimestamp,
    };
  };

  return {
    list: async (projectId: string, domainNames?: string[]) => {
      try {
        //TODO: Kubernetes field selectors only support =, ==, and != operators so for now we fetch all and filter client-side
        const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
          },
        });

        const dnsZones = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsZoneList;

        let filteredZones = dnsZones.items;

        // Filter by domain names
        if (domainNames?.length) {
          const domainNameSet = new Set(domainNames);
          filteredZones = filteredZones.filter(
            (dnsZone: ComMiloapisNetworkingDnsV1Alpha1DnsZone) =>
              dnsZone.spec?.domainName && domainNameSet.has(dnsZone.spec.domainName)
          );
        }

        return (
          filteredZones
            // // Filter out DNS zones that are being deleted
            // ?.filter(
            //   (dnsZone: ComMiloapisNetworkingDnsV1Alpha1DnsZone) =>
            //     typeof dnsZone.metadata?.deletionTimestamp === 'undefined'
            // )
            .map((dnsZone: ComMiloapisNetworkingDnsV1Alpha1DnsZone) => transformDnsZone(dnsZone))
        );
      } catch (e) {
        throw e;
      }
    },
    create: async (projectId: string, payload: FormDnsZoneSchema, dryRun: boolean = false) => {
      try {
        const response = await createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
          },
          query: {
            dryRun: dryRun ? 'All' : undefined,
          },
          body: {
            kind: 'DNSZone',
            apiVersion: 'dns.networking.miloapis.com/v1alpha1',
            metadata: {
              name: generateId(payload.domainName, { randomText: generateRandomString(6) }),
              annotations: {
                'kubernetes.io/description': payload.description ?? '',
              },
            },
            spec: {
              domainName: payload.domainName,
              dnsZoneClassName: 'datum-external-global-dns', // @TODO: Make this configurable
            },
          },
        });

        const dnsZone = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsZone;

        return dryRun ? dnsZone : transformDnsZone(dnsZone);
      } catch (e) {
        throw e;
      }
    },
    detail: async (projectId: string, id: string) => {
      try {
        const response = await readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
            name: id,
          },
        });

        const dnsZone = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsZone;

        return transformDnsZone(dnsZone);
      } catch (e) {
        throw e;
      }
    },
    update: async (
      projectId: string,
      id: string,
      payload: { description?: string },
      dryRun: boolean = false
    ) => {
      try {
        const response = await patchDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
            name: id,
          },
          query: {
            dryRun: dryRun ? 'All' : undefined,
            fieldManager: 'datum-cloud-portal',
          },
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
          body: {
            kind: 'DNSZone',
            apiVersion: 'dns.networking.miloapis.com/v1alpha1',
            metadata: {
              annotations: {
                'kubernetes.io/description': payload.description ?? '',
              },
            },
          },
        });

        const dnsZone = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsZone;

        return dryRun ? dnsZone : transformDnsZone(dnsZone);
      } catch (e) {
        throw e;
      }
    },
    delete: async (projectId: string, id: string) => {
      try {
        const response = await deleteDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
            name: id,
          },
        });

        return response.data;
      } catch (e) {
        throw e;
      }
    },
  };
};
