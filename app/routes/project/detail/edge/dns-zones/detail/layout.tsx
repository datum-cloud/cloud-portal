import { BackButton } from '@/components/back-button';
import { SubLayout } from '@/layouts';
import { createDnsRecordService } from '@/resources/dns-records';
import { createDnsZoneService, type DnsZone, useHydrateDnsZone } from '@/resources/dns-zones';
import { createDomainService, type Domain, useHydrateDomain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { redirectWithToast } from '@/utils/cookies';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-ui/components';
import { useMemo } from 'react';
import {
  LoaderFunctionArgs,
  MetaFunction,
  Outlet,
  data,
  useLoaderData,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: (data: { dnsZone: DnsZone }) => <span>{data?.dnsZone?.domainName}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const { dnsZone } = loaderData as { dnsZone: DnsZone };
  return metaObject(dnsZone?.domainName || 'DNS');
});

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, dnsZoneId } = params;

  if (!projectId || !dnsZoneId) {
    throw new BadRequestError('Project ID and DNS ID are required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const dnsZoneService = createDnsZoneService();

  const dnsZone = await dnsZoneService.get(projectId, dnsZoneId);

  if (!dnsZone) {
    throw new NotFoundError('DNS', dnsZoneId);
  }

  // If the DNS zone is being deleted, redirect to the DNS zones page
  if (dnsZone.deletionTimestamp) {
    return redirectWithToast(
      getPathWithParams(paths.project.detail.dnsZones.root, {
        projectId,
      }),
      {
        title: 'DNS is being deleted',
        description: 'This DNS is currently being deleted and is no longer accessible',
        type: 'message',
      }
    );
  }

  let domain: Domain | null = null;
  if (dnsZone.status?.domainRef?.name) {
    const domainService = createDomainService();
    domain = await domainService.get(projectId, dnsZone.status?.domainRef?.name ?? '');
  }

  // Use new DNS Records service
  const dnsRecordService = createDnsRecordService();
  const dnsRecordSets = await dnsRecordService.list(projectId, dnsZoneId);

  return data({ dnsZone, domain, dnsRecordSets });
};

export default function DnsZoneDetailLayout() {
  const { dnsZone, domain } = useLoaderData<typeof loader>();
  const { projectId, dnsZoneId } = useParams();

  // Hydrate cache with SSR data (watches are in individual pages to reduce connections)
  useHydrateDnsZone(projectId ?? '', dnsZoneId ?? '', dnsZone);

  // Hydrate domain cache if domain exists
  const domainName = domain?.name ?? '';
  useHydrateDomain(projectId ?? '', domainName, domain);

  const navItems: NavItem[] = useMemo(() => {
    return [
      /* {
        title: 'Overview',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.overview, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
        type: 'link',
      }, */
      {
        title: 'DNS Records',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.dnsRecords, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
        type: 'link',
      },
      {
        title: 'Nameservers',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.nameservers, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
        type: 'link',
      },
      {
        title: 'Settings',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.settings, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
        type: 'link',
      },
    ];
  }, [projectId, dnsZone]);

  return (
    <SubLayout
      sidebarHeader={
        <div className="flex flex-col gap-5.5">
          <BackButton
            className="hidden md:flex"
            to={getPathWithParams(paths.project.detail.dnsZones.root, {
              projectId,
            })}>
            Back to DNS
          </BackButton>
          <span className="text-primary text-sm font-semibold">Manage Zone</span>
        </div>
      }
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
