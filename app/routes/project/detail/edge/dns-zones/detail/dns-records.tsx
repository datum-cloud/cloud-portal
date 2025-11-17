import { DnsRecordTable } from '@/features/edge/dns-zone/overview/dns-records';
import { DnsRecordInlineForm } from '@/features/edge/dns-zone/overview/dns-records/dns-record-inline-form';
import { DataTableRef } from '@/modules/datum-ui/components/data-table';
import { createDnsRecordSetsControl } from '@/resources/control-plane/dns-networking/dns-record-set.control';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { BadRequestError } from '@/utils/errors';
import { Button } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-react';
import { useRef } from 'react';
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
  const tableRef = useRef<DataTableRef<IFlattenedDnsRecord>>(null);

  const handleDelete = (record: IFlattenedDnsRecord) => {
    if (confirm(`Are you sure you want to delete the ${record.type} record for ${record.name}?`)) {
      // TODO: Implement delete API call
      console.log('Deleting record:', record);
      alert('Delete functionality not yet implemented');
    }
  };

  return (
    <DnsRecordTable
      mode="full"
      data={dnsRecordSets}
      tableTitle={{
        title: 'DNS Records',
        actions: (
          <Button
            type="primary"
            theme="solid"
            size="small"
            onClick={() => tableRef.current?.openCreate()}>
            <PlusIcon className="size-4" />
            Add record
          </Button>
        ),
      }}
      toolbar={{
        layout: 'compact',
        includeSearch: {
          placeholder: 'Search DNS records',
        },
        filtersDisplay: 'dropdown',
      }}
      rowActions={[
        {
          key: 'edit',
          label: 'Edit',
          icon: <PencilIcon className="size-4" />,
          display: 'inline',
          triggerInlineEdit: true,
          showLabel: false,
          tooltip: 'Edit DNS record',
          action: (row) => {
            console.log('Starting edit for:', row);
          },
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <TrashIcon className="size-4" />,
          variant: 'destructive',
          tooltip: 'Delete DNS record',
          action: (row) => handleDelete(row),
        },
      ]}
      // Inline form configuration
      enableInlineContent={true}
      inlineContent={({ mode, data, onClose }) => (
        <div className="rounded-lg border px-7 py-5 shadow-sm">
          <DnsRecordInlineForm mode={mode} initialData={data} onClose={onClose} />
        </div>
      )}
      ref={tableRef}
    />
  );
}
