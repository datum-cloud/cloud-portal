import type {
  DnsResolverContext,
  DnsZoneAssociation,
  PrivateDnsCondition,
  PrivateZoneState,
  PrivateZoneVpcLink,
} from './private-dns.schema';
import type { DnsZone } from '@/resources/dns-zones';
import { DNS_ZONE_PENDING_REASONS } from '@/utils/helpers/dns/dns-zone-error.helper';

export const NETWORK_LABEL = 'networking.datumapis.com/network';
export const NETWORK_UID_LABEL = 'networking.datumapis.com/network-uid';

interface RawCondition {
  type?: string;
  status?: string;
  reason?: string;
  message?: string;
}

interface RawObject {
  metadata?: {
    name?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    deletionTimestamp?: string;
  };
  spec?: Record<string, unknown>;
  status?: Record<string, unknown> & { conditions?: RawCondition[] };
}

/** A network as the Portal knows it, enough to name the VPC behind a DNS context. */
export interface NetworkIdentity {
  name: string;
  uid?: string;
  displayName?: string;
}

function findCondition(raw: RawObject, type: string): PrivateDnsCondition | undefined {
  const found = raw.status?.conditions?.find((condition) => condition.type === type);
  if (!found) return undefined;
  const status =
    found.status === 'True' || found.status === 'False' ? found.status : ('Unknown' as const);
  return { status, reason: found.reason, message: found.message };
}

function refName(value: unknown): string {
  return (value as { name?: string } | undefined)?.name ?? '';
}

export function toDnsZoneAssociation(raw: RawObject): DnsZoneAssociation {
  return {
    name: raw.metadata?.name ?? '',
    zoneName: refName(raw.spec?.dnsZoneRef),
    contextName: refName(raw.spec?.resolverContextRef),
    accepted: findCondition(raw, 'Accepted'),
    deleting: Boolean(raw.metadata?.deletionTimestamp),
  };
}

export function toDnsResolverContext(raw: RawObject): DnsResolverContext {
  const managed = raw.status?.managedNamespace as { dnsZoneRef?: { name?: string } } | undefined;
  return {
    name: raw.metadata?.name ?? '',
    networkName: raw.metadata?.labels?.[NETWORK_LABEL],
    networkUid: raw.metadata?.labels?.[NETWORK_UID_LABEL],
    description: raw.metadata?.annotations?.['kubernetes.io/description'],
    managedZoneName: managed?.dnsZoneRef?.name || undefined,
    deleting: Boolean(raw.metadata?.deletionTimestamp),
  };
}

/**
 * The VPC a context belongs to, by UID first (names can be reused after a
 * delete), then by name. Contexts created before the labels existed fall back
 * to their own name.
 */
function vpcLabel(
  context: DnsResolverContext | undefined,
  contextName: string,
  networks: NetworkIdentity[]
) {
  const network =
    (context?.networkUid && networks.find((n) => n.uid === context.networkUid)) ||
    (context?.networkName && networks.find((n) => n.name === context.networkName)) ||
    undefined;
  const networkName = network?.name ?? context?.networkName;
  return {
    networkName,
    label: network?.displayName || networkName || contextName,
  };
}

/**
 * Every VPC that can resolve `zone`. A VPC's default zone is linked by
 * ownership rather than an association, so it is listed first and can't be
 * removed.
 */
export function getPrivateZoneVpcLinks(
  zone: Pick<DnsZone, 'name' | 'managedByContext'>,
  associations: DnsZoneAssociation[],
  contexts: DnsResolverContext[],
  networks: NetworkIdentity[] = []
): PrivateZoneVpcLink[] {
  const contextsByName = new Map(contexts.map((context) => [context.name, context]));
  const links: PrivateZoneVpcLink[] = [];

  const owner = contexts.find(
    (context) =>
      !context.deleting &&
      (context.name === zone.managedByContext || context.managedZoneName === zone.name)
  );
  if (owner) {
    links.push({
      key: `context:${owner.name}`,
      contextName: owner.name,
      ...vpcLabel(owner, owner.name, networks),
      isOwner: true,
      state: 'linked',
    });
  }

  for (const association of associations) {
    if (association.deleting || association.zoneName !== zone.name) continue;
    if (owner && association.contextName === owner.name) continue;
    const accepted = association.accepted;
    links.push({
      key: association.name,
      contextName: association.contextName,
      ...vpcLabel(contextsByName.get(association.contextName), association.contextName, networks),
      isOwner: false,
      state:
        accepted?.status === 'True'
          ? 'linked'
          : accepted?.status === 'False'
            ? 'failed'
            : 'linking',
      reason: accepted?.status === 'True' ? undefined : accepted?.reason,
      message: accepted?.status === 'True' ? undefined : accepted?.message,
    });
  }

  return links;
}

/**
 * Whether a private zone answers in its VPCs. The zone's `Programmed`
 * condition only turns True once a serving replica applied it, so missing or
 * pending means "preparing", not failure.
 */
export function getPrivateZoneState(
  zone: Pick<DnsZone, 'status'>,
  links: PrivateZoneVpcLink[]
): PrivateZoneState {
  if (!links.some((link) => link.state === 'linked')) {
    return 'unlinked';
  }
  const status = zone.status as RawObject['status'];
  const programmed = status?.conditions?.find((condition) => condition.type === 'Programmed');
  if (programmed?.status === 'True') return 'ready';
  if (
    programmed?.status === 'False' &&
    programmed.reason &&
    !DNS_ZONE_PENDING_REASONS.has(programmed.reason)
  ) {
    return 'failed';
  }
  return 'preparing';
}

/** Plain-language explanation for an association the DNS service didn't accept. */
export function describeLinkFailure(reason?: string, message?: string): string {
  switch (reason) {
    case 'ApexConflict':
      return 'Another private zone with the same name is already linked to this VPC. Remove that link first.';
    case 'ReservedScope':
      return 'This zone name overlaps names the platform reserves in this VPC. Choose a different zone name.';
    case 'InvalidReference':
      return 'The zone or VPC was deleted and recreated. Remove this link and add the VPC again.';
    default:
      return message?.trim() || 'The DNS service has not accepted this link.';
  }
}
