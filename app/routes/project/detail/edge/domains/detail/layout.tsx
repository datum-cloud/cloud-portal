import { createDomainsControl } from '@/resources/control-plane/domains.control';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { CustomError } from '@/utils/error';
import { mergeMeta, metaObject } from '@/utils/meta';
import { Client } from '@hey-api/client-axios';
import { LoaderFunctionArgs, AppLoadContext, data, MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: (data: IDomainControlResponse) => <span>{data?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ data }) => {
  const { domain } = data as any;
  return metaObject((domain as IDomainControlResponse)?.name || 'Domain');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, domainId } = params;
  const { controlPlaneClient } = context as AppLoadContext;

  if (!projectId || !domainId) {
    throw new CustomError('Project ID and domain ID are required', 400);
  }

  const domainsControl = createDomainsControl(controlPlaneClient as Client);

  const domain = await domainsControl.detail(projectId, domainId);

  if (!domain) {
    throw new CustomError('Domain not found', 404);
  }

  return data(domain);
};
