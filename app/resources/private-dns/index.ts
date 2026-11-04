export {
  dnsZoneAssociationSchema,
  dnsResolverContextSchema,
  type DnsZoneAssociation,
  type DnsResolverContext,
  type PrivateDnsCondition,
  type PrivateZoneLinkState,
  type PrivateZoneState,
  type PrivateZoneVpcLink,
} from './private-dns.schema';

export {
  NETWORK_LABEL,
  NETWORK_UID_LABEL,
  toDnsZoneAssociation,
  toDnsResolverContext,
  getPrivateZoneVpcLinks,
  getPrivateZoneState,
  describeLinkFailure,
  type NetworkIdentity,
} from './private-dns.adapter';

export {
  createPrivateDnsService,
  privateDnsKeys,
  type PrivateDnsService,
} from './private-dns.service';

export {
  usePrivateDnsLinkIndex,
  usePrivateZoneVpcLinks,
  type PrivateDnsLinkIndex,
  type PrivateZoneVpcLinksResult,
} from './private-dns.queries';
