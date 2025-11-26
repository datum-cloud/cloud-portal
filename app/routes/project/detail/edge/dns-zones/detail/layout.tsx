import { BackButton } from '@/components/back-button';
import { SubLayout } from '@/layouts';
import { createDomainsControl } from '@/resources/control-plane';
import { createDnsZonesControl } from '@/resources/control-plane/dns-networking';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { paths } from '@/utils/config/paths.config';
import { redirectWithToast } from '@/utils/cookies';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
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
  breadcrumb: (data: { dnsZone: IDnsZoneControlResponse }) => (
    <span>{data?.dnsZone?.domainName}</span>
  ),
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const { dnsZone } = loaderData as { dnsZone: IDnsZoneControlResponse };
  return metaObject(dnsZone?.domainName || 'DNS');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, dnsZoneId } = params;

  if (!projectId || !dnsZoneId) {
    throw new BadRequestError('Project ID and DNS ID are required');
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const dnsZonesControl = createDnsZonesControl(controlPlaneClient as Client);

  const dnsZone = await dnsZonesControl.detail(projectId, dnsZoneId);

  if (!dnsZone) {
    throw new NotFoundError('DNS not found');
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

  let domain: IDomainControlResponse | null = null;
  if (dnsZone.status?.domainRef?.name) {
    // Get Domain Detail
    const domainsControl = createDomainsControl(controlPlaneClient as Client);
    domain = await domainsControl.detail(projectId, dnsZone.status?.domainRef?.name ?? '');
  }

  return data({ dnsZone, domain });
};

export default function DnsZoneDetailLayout() {
  const { dnsZone } = useLoaderData<typeof loader>();
  const { projectId } = useParams();

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
