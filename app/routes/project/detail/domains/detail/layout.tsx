import { type SubNavigationTab } from '@/components/sub-navigation';
import { DomainHeaderActions } from '@/features/edge/domain/domain-header-actions';
import { SubLayout } from '@/layouts';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import { createDnsZoneService, type DnsZone } from '@/resources/dns-zones';
import { createDomainService, domainKeys, type Domain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { type LoaderFunctionArgs, Outlet, useParams } from 'react-router';

type DomainDetailCompanions = { dnsZone: DnsZone | null };

const route = defineResourceRoute<Domain, DomainDetailCompanions>({
  type: 'detail',
  resource: 'domains',
  paramName: 'domainId',
  notFoundLabel: 'Domain',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view this domain.",
  breadcrumb: ({ data }) => <span>{data?.domainName ?? 'Domain'}</span>,
  metaTitle: ({ data }) => data?.name ?? 'Domain',
  seedCache: ({ data, projectId, id }) => {
    const d = data as Domain;
    return [[domainKeys.detail(projectId, id), d]] as never;
  },
});

export const loader = (args: LoaderFunctionArgs) =>
  runDetailLoader<Domain, DomainDetailCompanions>(args, {
    resource: 'domains',
    group: 'networking.datumapis.com',
    scope: 'project',
    paramName: 'domainId',
    notFoundLabel: 'Domain',
    fetch: ({ projectId, id }) => createDomainService().get(projectId!, id),
    companions: {
      dnsZone: {
        resource: 'dnszones',
        group: 'dns.networking.miloapis.com',
        verb: 'list',
        scope: 'project',
        onError: 'tolerate',
        fetch: async ({ data: domain, projectId }) => {
          if (!domain?.name) return null;
          const zones = await createDnsZoneService().listByDomainRef(projectId!, domain.name, 1);
          return zones?.[0] ?? null;
        },
      },
    },
  });

export const handle = route.handle;
export const meta = route.meta;

export default route.Page(({ data: domain, companions }) => {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const dnsZone = companions.dnsZone;

  const navItems: SubNavigationTab[] = useMemo(
    () => [
      {
        label: 'Overview',
        href: getPathWithParams(paths.project.detail.domains.detail.overview, {
          projectId,
          domainId: domain?.name ?? '',
        }),
      },
      {
        label: 'Activity',
        href: getPathWithParams(paths.project.detail.domains.detail.activity, {
          projectId,
          domainId: domain?.name ?? '',
        }),
      },
      {
        label: 'Settings',
        href: getPathWithParams(paths.project.detail.domains.detail.settings, {
          projectId,
          domainId: domain?.name ?? '',
        }),
      },
    ],
    [projectId, domain?.name]
  );

  return (
    <SubLayout
      title={domain?.domainName}
      actions={
        domain && <DomainHeaderActions projectId={projectId} domain={domain} dnsZone={dnsZone} />
      }
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
});
