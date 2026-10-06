import { useResourcePermissions } from '@/modules/rbac';
import { useDnsZonesWatch } from '@/resources/dns-zones';
import { useDomainsWatch } from '@/resources/domains';
import { useHttpProxiesWatch } from '@/resources/http-proxies';

/**
 * Keeps the project's domain, DNS zone, and HTTPProxy list watches open while
 * the project is open, so those caches don't go stale after leaving a list page.
 */
export function ProjectWatchBridge({ projectId }: { projectId: string }) {
  const { canList, canViewDnsZones, canViewProxies } = useResourcePermissions({
    resource: 'domains',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['list'],
    subResources: [
      {
        resource: 'dnszones',
        group: 'dns.networking.miloapis.com',
        scope: 'project',
        alias: 'dnsZones',
        verbs: ['list'],
      },
      {
        resource: 'httpproxies',
        group: 'networking.datumapis.com',
        scope: 'project',
        alias: 'proxies',
        verbs: ['list'],
      },
    ],
  });

  const enabled = !!projectId;
  useDomainsWatch(projectId, { enabled: enabled && canList });
  useDnsZonesWatch(projectId, { enabled: enabled && canViewDnsZones });
  useHttpProxiesWatch(projectId, { enabled: enabled && canViewProxies });
  return null;
}
