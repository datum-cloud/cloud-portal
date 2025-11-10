import { DnsZoneForm } from '@/features/edge/dns-zone/form';
import { createDnsZonesControl } from '@/resources/control-plane/dns-networking';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns-zone.interface';
import { formDnsZoneSchema } from '@/resources/schemas/dns-zone.schema';
import { paths } from '@/utils/config/paths.config';
import { dataWithToast, validateCSRF } from '@/utils/cookies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import {
  ActionFunctionArgs,
  AppLoadContext,
  MetaFunction,
  redirect,
  useParams,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>New</span>,
};
export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New DNS Zone');
});

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    const parsed = parseWithZod(formData, { schema: formDnsZoneSchema });

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const dnsZonesControl = createDnsZonesControl(controlPlaneClient as Client);

    const dryRunRes = await dnsZonesControl.create(projectId, parsed.value, true);

    let res: IDnsZoneControlResponse = {};
    if (dryRunRes) {
      res = await dnsZonesControl.create(projectId, parsed.value, false);
    }

    return redirect(
      getPathWithParams(paths.project.detail.dnsZones.root, {
        projectId,
      })
    );
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
};

export default function DnsZoneNewPage() {
  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <DnsZoneForm projectId={projectId ?? ''} />
    </div>
  );
}
