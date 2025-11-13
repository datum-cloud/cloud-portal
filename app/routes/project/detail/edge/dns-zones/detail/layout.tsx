import { BackButton } from '@/components/back-button';
import { SubLayout } from '@/layouts';
import { createDnsZonesControl } from '@/resources/control-plane/dns-networking';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns-zone.interface';
import { paths } from '@/utils/config/paths.config';
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
  useParams,
  useRouteLoaderData,
} from 'react-router';

export const handle = {
  breadcrumb: (data: IDnsZoneControlResponse) => <span>{data?.domainName}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const dnsZone = loaderData as IDnsZoneControlResponse;
  return metaObject(dnsZone?.domainName || 'DNS');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, dnsZoneId } = params;
  const { controlPlaneClient } = context as AppLoadContext;

  if (!projectId || !dnsZoneId) {
    throw new BadRequestError('Project ID and DNS ID are required');
  }

  const dnsZonesControl = createDnsZonesControl(controlPlaneClient as Client);

  const dnsZone = await dnsZonesControl.detail(projectId, dnsZoneId);

  if (!dnsZone) {
    throw new NotFoundError('DNS not found');
  }

  return data(dnsZone);
};

export default function DnsZoneDetailLayout() {
  const dnsZone = useRouteLoaderData<IDnsZoneControlResponse>('dns-zone-detail');
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
