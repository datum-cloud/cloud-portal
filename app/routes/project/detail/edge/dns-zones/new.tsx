import { DnsZoneDiscoveryPreview } from '@/features/edge/dns-zone/discovery-preview';
import { DnsZoneForm } from '@/features/edge/dns-zone/form';
import { createDnsZonesControl } from '@/resources/control-plane/dns-networking';
import { createDnsZoneDiscoveriesControl } from '@/resources/control-plane/dns-networking/dns-zone-discoveries.control';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { formDnsZoneSchema } from '@/resources/schemas/dns-zone.schema';
import { dataWithToast, validateCSRF } from '@/utils/cookies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import {
  ActionFunctionArgs,
  AppLoadContext,
  MetaFunction,
  data,
  useActionData,
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

    // Create DNS Zone Discovery
    const dnsZoneDiscoveriesControl = createDnsZoneDiscoveriesControl(controlPlaneClient as Client);
    const dnsDiscoveryRes = await dnsZoneDiscoveriesControl.create(
      projectId,
      res.name ?? '',
      false
    );

    return data({ dnsZone: res, dnsDiscovery: dnsDiscoveryRes });
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
};

export default function DnsZoneNewPage() {
  const res = useActionData<typeof action>();
  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      {res && res?.dnsZone && res?.dnsDiscovery ? (
        <DnsZoneDiscoveryPreview
          projectId={projectId ?? ''}
          dnsZoneId={res.dnsZone.name ?? ''}
          dnsZoneDiscoveryId={res.dnsDiscovery.name ?? ''}
        />
      ) : (
        <DnsZoneForm projectId={projectId ?? ''} />
      )}
    </div>
  );
}
