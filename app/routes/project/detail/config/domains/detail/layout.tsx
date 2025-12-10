import { createDnsZonesControl, createDomainsControl } from '@/resources/control-plane';
import type { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Client } from '@hey-api/client-axios';
import { LoaderFunctionArgs, AppLoadContext, data, MetaFunction, Outlet } from 'react-router';

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
  const dnsZones = await dnsZonesControl.list(projectId, [domain?.domainName ?? '']);
  const dnsZone = dnsZones.find((zone) => zone.domainName === domain?.domainName) ?? null;

  if (!domain) {
    throw new NotFoundError('Domain not found');
  }

  return data({ domain, dnsZone });
};

export default function DomainDetailLayout() {
  return <Outlet />;
}
