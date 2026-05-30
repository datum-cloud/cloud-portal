import { DnsZoneDiscoveryPreview } from '@/features/edge/dns-zone/discovery-preview';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import { createDnsZoneService, type DnsZone } from '@/resources/dns-zones';
import { type LoaderFunctionArgs, useParams } from 'react-router';

const route = defineResourceRoute<DnsZone>({
  type: 'detail',
  resource: 'dnszones',
  paramName: 'dnsZoneId',
  notFoundLabel: 'DNS',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view this DNS zone.",
  metaTitle: 'DNS Zone Discovery',
  breadcrumb: () => <span>Discovery</span>,
});

export const loader = (args: LoaderFunctionArgs) =>
  runDetailLoader<DnsZone, Record<string, never>>(args, {
    resource: 'dnszones',
    group: 'dns.networking.miloapis.com',
    scope: 'project',
    paramName: 'dnsZoneId',
    notFoundLabel: 'DNS',
    fetch: ({ projectId, id }) => createDnsZoneService().get(projectId!, id),
  });
export const handle = route.handle;
export const meta = route.meta;

export default route.Page(() => {
  const { projectId = '', dnsZoneId = '' } = useParams<{
    projectId: string;
    dnsZoneId: string;
  }>();
  return (
    <div className="mx-auto w-full max-w-4xl py-8">
      <DnsZoneDiscoveryPreview projectId={projectId} dnsZoneId={dnsZoneId} />
    </div>
  );
});
