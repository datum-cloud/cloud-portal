import { DomainHeaderActions } from '@/features/edge/domain/domain-header-actions';
import { DomainStatus } from '@/features/edge/domain/status';
import { SubLayout } from '@/layouts';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import { createDnsZoneService, type DnsZone } from '@/resources/dns-zones';
import { createDomainService, domainKeys, type Domain, useDomain } from '@/resources/domains';
import { skipRevalidateWithinSameProjectResource } from '@/utils/helpers/revalidate.helper';
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

export const shouldRevalidate = skipRevalidateWithinSameProjectResource('domainId');

export default route.Page(({ data: domain, companions }) => {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const dnsZone = companions.dnsZone;
  // Live data so the header badge flips as soon as the watch reports verification
  const { data: liveDomain } = useDomain(projectId, domain?.name ?? '', {
    enabled: !!domain?.name,
    initialData: domain,
  });
  const effectiveDomain = liveDomain ?? domain;

  return (
    <SubLayout
      title={domain?.domainName}
      status={
        effectiveDomain && (
          <div className="mt-1.5">
            <DomainStatus domainStatus={effectiveDomain.status} />
          </div>
        )
      }
      actions={
        domain && <DomainHeaderActions projectId={projectId} domain={domain} dnsZone={dnsZone} />
      }>
      <Outlet />
    </SubLayout>
  );
});
