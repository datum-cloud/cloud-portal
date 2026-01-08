import {
  dnsZoneSchema,
  type DnsZone,
  type DnsZoneList,
  type CreateDnsZoneInput,
} from './dns-zone.schema';
import type { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@/modules/control-plane/dns-networking';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';

export function toDnsZone(raw: ComMiloapisNetworkingDnsV1Alpha1DnsZone): DnsZone {
  const transformed = {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace ?? '',
    displayName: raw.spec?.domainName ?? raw.metadata?.name ?? '',
    description: raw.metadata?.annotations?.['kubernetes.io/description'],
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp ?? new Date(),
    domainName: raw.spec?.domainName ?? '',
    dnsZoneClassName: raw.spec?.dnsZoneClassName ?? '',
    status: raw.status ?? {},
    deletionTimestamp: raw.metadata?.deletionTimestamp,
  };

  return dnsZoneSchema.parse(transformed);
}

export function toDnsZoneList(
  items: ComMiloapisNetworkingDnsV1Alpha1DnsZone[],
  continueToken?: string
): DnsZoneList {
  const activeZones = items.filter(
    (zone) => typeof zone.metadata?.deletionTimestamp === 'undefined'
  );

  return {
    items: activeZones.map(toDnsZone),
    nextCursor: continueToken ?? null,
    hasMore: Boolean(continueToken),
  };
}

export function toCreateDnsZonePayload(input: CreateDnsZoneInput) {
  return {
    kind: 'DNSZone' as const,
    apiVersion: 'dns.networking.miloapis.com/v1alpha1' as const,
    metadata: {
      name: generateId(input.domainName, { randomText: generateRandomString(6) }),
      annotations: {
        'kubernetes.io/description': input.description ?? '',
      },
    },
    spec: {
      domainName: input.domainName,
      dnsZoneClassName: 'datum-external-global-dns',
    },
  };
}

export function toUpdateDnsZonePayload(input: { description?: string }) {
  return {
    kind: 'DNSZone' as const,
    apiVersion: 'dns.networking.miloapis.com/v1alpha1' as const,
    metadata: {
      annotations: {
        'kubernetes.io/description': input.description ?? '',
      },
    },
  };
}
