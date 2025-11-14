import { DnsZoneForm } from '@/features/edge/dns-zone/form';
import { createDnsZonesControl } from '@/resources/control-plane/dns-networking';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { formDnsZoneSchema } from '@/resources/schemas/dns-zone.schema';
import { paths } from '@/utils/config/paths.config';
import { dataWithToast, redirectWithToast, validateCSRF } from '@/utils/cookies';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import {
  ActionFunctionArgs,
  AppLoadContext,
  LoaderFunctionArgs,
  MetaFunction,
  data,
  useLoaderData,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: (data: IDnsZoneControlResponse) => <span>Edit {data?.domainName}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const dnsZone = loaderData as IDnsZoneControlResponse;
  return metaObject(`Edit ${dnsZone?.domainName || 'DNS Zone'}`);
});

export const action = async ({ params, context, request }: ActionFunctionArgs) => {
  const { projectId, dnsZoneId } = params;

  if (!projectId || !dnsZoneId) {
    throw new BadRequestError('Project ID and DNS Zone ID are required');
  }

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    const parsed = parseWithZod(formData, {
      schema: formDnsZoneSchema.pick({ description: true }),
    });

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const dnsZoneControl = createDnsZonesControl(controlPlaneClient as Client);

    const dryRunRes = await dnsZoneControl.update(projectId, dnsZoneId, parsed.value, true);

    if (dryRunRes) {
      await dnsZoneControl.update(projectId, dnsZoneId, parsed.value, false);
    }

    return redirectWithToast(
      getPathWithParams(paths.project.detail.dnsZones.root, {
        projectId,
      }),
      {
        title: 'DNS Zone updated successfully',
        description: 'You have successfully updated a DNS Zone.',
        type: 'success',
      }
    );
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
};

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, dnsZoneId } = params;
  const { controlPlaneClient } = context as AppLoadContext;

  if (!projectId || !dnsZoneId) {
    throw new BadRequestError('Project ID and DNS Zone ID are required');
  }

  const dnsZonesControl = createDnsZonesControl(controlPlaneClient as Client);

  const dnsZone = await dnsZonesControl.detail(projectId, dnsZoneId);

  if (!dnsZone) {
    throw new NotFoundError('DNS Zone not found');
  }

  return data(dnsZone);
};

export default function DnsZoneEditPage() {
  const dnsZone = useLoaderData<typeof loader>();
  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <DnsZoneForm projectId={projectId ?? ''} defaultValue={dnsZone} />
    </div>
  );
}
