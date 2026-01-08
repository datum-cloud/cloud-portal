export {
  dnsZoneSchema,
  dnsZoneListSchema,
  dnsZoneStatusSchema,
  createDnsZoneSchema,
  updateDnsZoneSchema,
  type DnsZone,
  type DnsZoneList,
  type DnsZoneStatus,
  type CreateDnsZoneInput,
  type UpdateDnsZoneInput,
} from './dns-zone.schema';

export {
  toDnsZone,
  toDnsZoneList,
  toCreateDnsZonePayload,
  toUpdateDnsZonePayload,
} from './dns-zone.adapter';

export { createDnsZoneService, dnsZoneKeys, type DnsZoneService } from './dns-zone.service';

export {
  useDnsZones,
  useDnsZone,
  useDnsZonesByDomainRef,
  useCreateDnsZone,
  useUpdateDnsZone,
  useDeleteDnsZone,
  useHydrateDnsZones,
  useHydrateDnsZone,
} from './dns-zone.queries';

export * from './dns-zone.watch';
