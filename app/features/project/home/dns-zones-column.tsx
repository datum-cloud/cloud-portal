import { domainsWithoutZone, isHealthy, newestFirst } from './home.helpers';
import {
  ResourceColumn,
  ResourceColumnAddAction,
  ResourceColumnEmpty,
  ResourceColumnEmptyAction,
} from './resource-column';
import { BadgeStatus } from '@/components/badge/badge-status';
import { useResourcePermissions } from '@/modules/rbac';
import { useDnsZones } from '@/resources/dns-zones';
import { useDomains } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Signpost } from 'lucide-react';

export function DnsZonesColumn({ projectId }: { projectId: string }) {
  const { data: zones = [], isLoading } = useDnsZones(projectId, undefined, {
    staleTime: QUERY_STALE_TIME,
    refetchOnMount: false,
  });
  const { data: domains = [] } = useDomains(projectId, {
    staleTime: QUERY_STALE_TIME,
    refetchOnMount: false,
  });
  const { canCreate } = useResourcePermissions({
    resource: 'dnszones',
    group: 'dns.networking.miloapis.com',
    scope: 'project',
    verbs: ['create'],
  });

  const listHref = getPathWithParams(paths.project.detail.dnsZones.root, { projectId });

  const createHrefFor = (domainName?: string) =>
    getPathWithParams(
      paths.project.detail.dnsZones.root,
      { projectId },
      new URLSearchParams({ action: 'create', ...(domainName ? { domainName } : {}) })
    );

  return (
    <ResourceColumn
      title="DNS zones"
      href={listHref}
      count={zones.length}
      action={
        canCreate &&
        zones.length > 0 && <ResourceColumnAddAction href={createHrefFor()} label="Add DNS zone" />
      }
      isLoading={isLoading}
      testId="project-home-dns-zones"
      items={newestFirst(zones).map((zone) => ({
        key: zone.uid,
        label: zone.domainName,
        href: getPathWithParams(paths.project.detail.dnsZones.detail.root, {
          projectId,
          dnsZoneId: zone.name,
        }),
        icon: (
          <Icon icon={Signpost} size={14} className="text-icon-quaternary shrink-0" aria-hidden />
        ),
        meta: zone.status && !isHealthy(zone.status) && (
          <BadgeStatus status={transformControlPlaneStatus(zone.status)} />
        ),
      }))}
      suggestions={
        canCreate
          ? domainsWithoutZone(domains, zones).map((domain) => ({
              key: domain.uid,
              label: `Add a DNS zone for ${domain.domainName}`,
              href: createHrefFor(domain.domainName),
            }))
          : []
      }
      emptyState={
        <ResourceColumnEmpty
          icon={<Icon icon={Signpost} size={18} aria-hidden />}
          title="Host your DNS"
          action={
            canCreate && (
              <ResourceColumnEmptyAction href={createHrefFor()}>
                Add DNS zone
              </ResourceColumnEmptyAction>
            )
          }>
          Create a zone to manage records on Datum&apos;s global nameservers.
        </ResourceColumnEmpty>
      }
    />
  );
}
