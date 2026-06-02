import { type SubNavigationTab } from '@/components/sub-navigation';
import { DnsZoneErrorBanner } from '@/features/edge/dns-zone/components/dns-zone-error-banner';
import { SubLayout } from '@/layouts';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import { createDnsZoneService, dnsZoneKeys, type DnsZone } from '@/resources/dns-zones';
import { createDomainService, domainKeys, type Domain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { type LoaderFunctionArgs, Outlet, useParams } from 'react-router';

type DnsZoneDetailCompanions = { domain: Domain | null };

const route = defineResourceRoute<DnsZone, DnsZoneDetailCompanions>({
  type: 'detail',
  resource: 'dnszones',
  paramName: 'dnsZoneId',
  notFoundLabel: 'DNS',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view this DNS zone.",
  breadcrumb: ({ data }) => <span>{data?.domainName ?? 'DNS'}</span>,
  metaTitle: ({ data }) => data?.domainName ?? 'DNS',
  seedCache: ({ data, companions, projectId, id }) => {
    const entries: Array<[readonly unknown[], unknown]> = [
      [dnsZoneKeys.detail(projectId, id), data],
    ];
    if (companions.domain) {
      entries.push([domainKeys.detail(projectId, companions.domain.name), companions.domain]);
    }
    return entries as never;
  },
});

export const loader = (args: LoaderFunctionArgs) =>
  runDetailLoader<DnsZone, DnsZoneDetailCompanions>(args, {
    resource: 'dnszones',
    group: 'dns.networking.miloapis.com',
    scope: 'project',
    paramName: 'dnsZoneId',
    notFoundLabel: 'DNS',
    fetch: ({ projectId, id }) => createDnsZoneService().get(projectId!, id),
    redirectIfDeleting: ({ data, projectId }) =>
      data.deletionTimestamp
        ? {
            to: getPathWithParams(paths.project.detail.dnsZones.root, { projectId }),
            toast: {
              title: 'DNS is being deleted',
              description: 'This DNS is currently being deleted and is no longer accessible',
              type: 'message',
            },
          }
        : null,
    companions: {
      domain: {
        resource: 'domains',
        group: 'networking.datumapis.com',
        verb: 'get',
        scope: 'project',
        onError: 'tolerate',
        fetch: ({ data, projectId }) =>
          data.status?.domainRef?.name
            ? createDomainService().get(projectId, data.status.domainRef.name)
            : Promise.resolve(null),
      },
    },
  });
export const handle = route.handle;
export const meta = route.meta;

export default route.Page(({ data: dnsZone }) => {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navItems: SubNavigationTab[] = useMemo(
    () => [
      {
        label: 'DNS Records',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.dnsRecords, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
      },
      {
        label: 'Nameservers',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.nameservers, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
      },
      {
        label: 'Activity',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.activity, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
      },
      {
        label: 'Settings',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.settings, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
      },
    ],
    [projectId, dnsZone]
  );

  return (
    <SubLayout title={dnsZone?.domainName} navItems={navItems}>
      <DnsZoneErrorBanner zone={dnsZone} className="mb-6" />
      <Outlet />
    </SubLayout>
  );
});
