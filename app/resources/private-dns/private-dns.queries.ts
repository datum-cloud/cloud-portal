import {
  getPrivateZoneState,
  getPrivateZoneVpcLinks,
  type NetworkIdentity,
} from './private-dns.adapter';
import type { PrivateZoneState, PrivateZoneVpcLink } from './private-dns.schema';
import { createPrivateDnsService, privateDnsKeys } from './private-dns.service';
import type { DnsZone } from '@/resources/dns-zones';
import {
  resolveRelatedResource,
  type RelatedResourceState,
} from '@/resources/http-proxies/related-resource';
import { useNetworks } from '@/resources/networks';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

/** Links refresh on a timer: the DNS service updates their status on its own schedule. */
const REFETCH_INTERVAL_MS = 15_000;

export interface PrivateZoneVpcLinksResult {
  links: PrivateZoneVpcLink[];
  state: PrivateZoneState;
  /** 'forbidden' when the viewer can't read links; the zone's own status still shows. */
  access: RelatedResourceState;
  isLoading: boolean;
}

export interface PrivateDnsLinkIndex {
  /** Links and state for one private zone. */
  forZone: (zone: DnsZone) => Pick<PrivateZoneVpcLinksResult, 'links' | 'state'>;
  access: RelatedResourceState;
  isLoading: boolean;
}

/**
 * Every zone-to-VPC link in a project, for pages that show several zones.
 * Pass `enabled: false` when the project has no private zones to skip the
 * requests.
 */
export function usePrivateDnsLinkIndex(projectId: string, enabled = true): PrivateDnsLinkIndex {
  const active = !!projectId && enabled;
  const associations = useQuery({
    queryKey: privateDnsKeys.associations(projectId),
    queryFn: () =>
      resolveRelatedResource(() => createPrivateDnsService().listAssociations(projectId)),
    enabled: active,
    retry: false,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
  const contexts = useQuery({
    queryKey: privateDnsKeys.contexts(projectId),
    queryFn: () => resolveRelatedResource(() => createPrivateDnsService().listContexts(projectId)),
    enabled: active,
    retry: false,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
  const { data: networkList } = useNetworks(projectId, { enabled: active });

  const networks: NetworkIdentity[] = useMemo(
    () =>
      (networkList ?? []).map((network) => ({
        name: network.metadata?.name ?? '',
        uid: network.metadata?.uid,
        displayName: network.metadata?.annotations?.['kubernetes.io/display-name'],
      })),
    [networkList]
  );

  const associationItems = associations.data?.data;
  const contextItems = contexts.data?.data;
  const forZone = useCallback(
    (zone: DnsZone) => {
      const links = getPrivateZoneVpcLinks(
        zone,
        associationItems ?? [],
        contextItems ?? [],
        networks
      );
      return { links, state: getPrivateZoneState(zone, links) };
    },
    [associationItems, contextItems, networks]
  );

  const access: RelatedResourceState =
    associations.data?.state === 'forbidden' || contexts.data?.state === 'forbidden'
      ? 'forbidden'
      : associations.isError || contexts.isError
        ? 'error'
        : 'ok';

  return { forZone, access, isLoading: associations.isLoading || contexts.isLoading };
}

/** Which VPCs can resolve a private zone, and whether the zone answers there yet. */
export function usePrivateZoneVpcLinks(
  projectId: string,
  zone: DnsZone | null | undefined
): PrivateZoneVpcLinksResult {
  const { forZone, access, isLoading } = usePrivateDnsLinkIndex(projectId, !!zone?.isPrivate);
  return useMemo(() => {
    if (!zone) {
      return { links: [], state: 'unlinked', access, isLoading };
    }
    return { ...forZone(zone), access, isLoading };
  }, [zone, forZone, access, isLoading]);
}
