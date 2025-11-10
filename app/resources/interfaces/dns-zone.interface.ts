import { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@/modules/control-plane/dns-networking';

export interface IDnsZoneControlResponse {
  name?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  namespace?: string;
  domainName?: string;
  description?: string;
  dnsZoneClassName?: string;
  status?: ComMiloapisNetworkingDnsV1Alpha1DnsZone['status'];
}
