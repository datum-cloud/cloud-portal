import { BackButton } from '@/components/back-button';
import { SubLayout } from '@/layouts';
import { createDnsZoneService, type DnsZone } from '@/resources/dns-zones';
import { createDomainService, type Domain, useHydrateDomain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-ui/components';
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

export const loader = async ({ params }: LoaderFunctionArgs) => {
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
    dnsZone = dnsZoneList.items[0] ?? null;
  }

  return data({ domain, dnsZone });
};

export default function DomainDetailLayout() {
  const { domain } = useLoaderData<typeof loader>();
  const { projectId, domainId } = useParams();

  // Hydrate cache with SSR data
  useHydrateDomain(projectId ?? '', domainId ?? '', domain);

  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Overview',
        href: getPathWithParams(paths.project.detail.domains.detail.overview, {
          projectId,
          domainId: domain?.name ?? '',
        }),
        type: 'link',
      },
      {
        title: 'Settings',
        href: getPathWithParams(paths.project.detail.domains.detail.settings, {
          projectId,
          domainId: domain?.name ?? '',
        }),
        type: 'link',
      },
    ];
  }, [projectId, domain]);

  return (
    <SubLayout
      sidebarHeader={
        <div className="flex flex-col gap-5.5">
          <BackButton
            to={getPathWithParams(paths.project.detail.domains.root, {
              projectId,
            })}>
            Back to Domains
          </BackButton>
          <span className="text-primary text-sm font-semibold">Manage Domain</span>
        </div>
      }
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
