import { DnsRecordTable } from '@/features/edge/dns-zone/overview/dns-records';
import { createDnsRecordSetsControl } from '@/resources/control-plane/dns-networking/dns-record-set.control';
import { BadRequestError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data, useLoaderData } from 'react-router';

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, dnsZoneId } = params;
  const { controlPlaneClient } = context as AppLoadContext;

  if (!projectId || !dnsZoneId) {
    throw new BadRequestError('Project ID and DNS Zone ID are required');
  }

  const dnsRecordSetsControl = createDnsRecordSetsControl(controlPlaneClient as Client);
  const dnsRecordSets = await dnsRecordSetsControl.list(projectId, dnsZoneId);

  return data(dnsRecordSets);
};

export default function DnsRecordsPage() {
  const dnsRecordSets = useLoaderData<typeof loader>();
  return (
    <DnsRecordTable
      data={dnsRecordSets}
      tableTitle={{
        title: 'DNS Records',
      }}
      toolbar={{
        layout: 'compact',
        includeSearch: {
          placeholder: 'Search DNS records',
        },
        filtersDisplay: 'dropdown',
      }}
    />
  );
}
