import { BackButton } from '@/components/back-button';
import { SubLayout } from '@/layouts';
import { createDnsZonesControl, createDomainsControl } from '@/resources/control-plane';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import type { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { useMemo } from 'react';
import {
  LoaderFunctionArgs,
  AppLoadContext,
  data,
  MetaFunction,
  Outlet,
  useLoaderData,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: ({ domain }: { domain: IDomainControlResponse }) => <span>{domain?.domainName}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const domain = loaderData as IDomainControlResponse;
  return metaObject(domain?.name || 'Domain');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, domainId } = params;
  const { controlPlaneClient } = context as AppLoadContext;

  if (!projectId || !domainId) {
    throw new BadRequestError('Project ID and domain ID are required');
  }

  const domainsControl = createDomainsControl(controlPlaneClient as Client);
  const dnsZonesControl = createDnsZonesControl(controlPlaneClient as Client);

  const domain = await domainsControl.detail(projectId, domainId);

  if (!domain) {
    throw new NotFoundError('Domain not found');
  }

  let dnsZone: IDnsZoneControlResponse | null = null;
  if (domain?.domainName) {
    const dnsZones = await dnsZonesControl.listByDomainRef(projectId, domain?.domainName ?? '', 1);
    dnsZone = dnsZones?.[0] ?? null;
  }

  return data({ domain, dnsZone });
};

export default function DomainDetailLayout() {
  const { domain } = useLoaderData<typeof loader>();
  const { projectId } = useParams();

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
        <div className="flex flex-col gap-3.5">
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
