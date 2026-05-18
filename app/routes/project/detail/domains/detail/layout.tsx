import { type SubNavigationTab } from '@/components/sub-navigation';
import { DomainHeaderActions } from '@/features/edge/domain/domain-header-actions';
import { SubLayout } from '@/layouts';
import { createDnsZoneService, type DnsZone } from '@/resources/dns-zones';
import { createDomainService, type Domain, useDomain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError, withLoaderErrors } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import {
  LoaderFunctionArgs,
  data,
  MetaFunction,
  Outlet,
  useLoaderData,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: ({ domain }: { domain: Domain }) => <span>{domain?.domainName}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const { domain } = loaderData as { domain: Domain };
  return metaObject(domain?.name || 'Domain');
});

export const loader = withLoaderErrors(async ({ params }: LoaderFunctionArgs) => {
  const { projectId, domainId } = params;

  if (!projectId || !domainId) {
    throw new BadRequestError('Project ID and domain ID are required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const domainService = createDomainService();
  const domain = await domainService.get(projectId, domainId);

  if (!domain) {
    throw new NotFoundError('Domain', domainId);
  }

  const dnsZoneService = createDnsZoneService();

  let dnsZone: DnsZone | null = null;
  if (domain?.name) {
    const dnsZoneList = await dnsZoneService.listByDomainRef(projectId, domain.name, 1);
    dnsZone = dnsZoneList?.[0] ?? null;
  }

  return data({ domain, dnsZone });
});

export default function DomainDetailLayout() {
  const { domain, dnsZone } = useLoaderData<typeof loader>();
  const { projectId, domainId } = useParams();

  // Seed cache synchronously with SSR data so child routes read it without skeleton flash
  useDomain(projectId ?? '', domainId ?? '', {
    initialData: domain,
    initialDataUpdatedAt: Date.now(),
  });

  const navItems: SubNavigationTab[] = useMemo(() => {
    return [
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
    ];
  }, [projectId, domain]);

  return (
    <SubLayout
      title={domain?.domainName}
      actions={
        domain && (
          <DomainHeaderActions projectId={projectId ?? ''} domain={domain} dnsZone={dnsZone} />
        )
      }
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
