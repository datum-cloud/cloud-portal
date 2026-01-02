import { BackButton } from '@/components/back-button';
import { SubLayout } from '@/layouts';
import { createDnsRecordService } from '@/resources/dns-records';
import {
  createDnsZoneService,
  type DnsZone,
  useHydrateDnsZone,
  useDnsZoneWatch,
} from '@/resources/dns-zones';
import {
  createDomainService,
  type Domain,
  useHydrateDomain,
  useDomainWatch,
} from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { redirectWithToast } from '@/utils/cookies';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-ui/components';
import { useMemo } from 'react';
import {
  AppLoadContext,
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

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, dnsZoneId } = params;

  if (!projectId || !dnsZoneId) {
    throw new BadRequestError('Project ID and DNS ID are required');
  }

  const { controlPlaneClient, requestId } = context as AppLoadContext;
  const dnsZoneService = createDnsZoneService({ controlPlaneClient, requestId });

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
    const domainService = createDomainService({ controlPlaneClient, requestId });
    domain = await domainService.get(projectId, dnsZone.status?.domainRef?.name ?? '');
  }

  // Use new DNS Records service
  const dnsRecordService = createDnsRecordService({ controlPlaneClient, requestId });
  const dnsRecordSets = await dnsRecordService.list(projectId, dnsZoneId);

  return data({ dnsZone, domain, dnsRecordSets });
};

export default function DnsZoneDetailLayout() {
  const { dnsZone, domain } = useLoaderData<typeof loader>();
  const { projectId, dnsZoneId } = useParams();

  // Hydrate cache with SSR data
  useHydrateDnsZone(projectId ?? '', dnsZoneId ?? '', dnsZone);

  // Enable watch for real-time updates
  useDnsZoneWatch(projectId ?? '', dnsZoneId ?? '');

  // Hydrate domain cache if domain exists (hooks must be called unconditionally)
  const domainName = domain?.name ?? '';
  const hasDomain = !!domain && !!domainName;

  // Hydrate domain - hook handles null/undefined gracefully
  useHydrateDomain(projectId ?? '', domainName, domain);

  // Enable watch for domain real-time updates - disabled if no domain
  useDomainWatch(projectId ?? '', domainName, { enabled: hasDomain });

  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Overview',
        href: getPathWithParams(paths.project.detail.dnsZones.detail.overview, {
          projectId,
          dnsZoneId: dnsZone?.name ?? '',
        }),
        type: 'link',
      },
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
        <div className="flex flex-col gap-3.5">
          <BackButton
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
