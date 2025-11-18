import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DnsRecordTable } from '@/features/edge/dns-zone/overview/dns-records';
import { DnsRecordInlineForm } from '@/features/edge/dns-zone/overview/dns-records/dns-record-inline-form';
import {
  DnsRecordModalForm,
  DnsRecordModalFormRef,
} from '@/features/edge/dns-zone/overview/dns-records/dns-record-modal-form';
import { DataTableRef } from '@/modules/datum-ui/components/data-table';
import { createDnsRecordSetsControl } from '@/resources/control-plane/dns-networking/dns-record-set.control';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { ROUTE_PATH as DNS_RECORDS_ACTIONS_PATH } from '@/routes/api/dns-records';
import { BadRequestError } from '@/utils/errors';
import { Button, toast } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { ArrowRightIcon, PencilIcon, PlusIcon, Trash2Icon, XCircleIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  AppLoadContext,
  LoaderFunctionArgs,
  data,
  useFetcher,
  useLoaderData,
  useParams,
  useRevalidator,
} from 'react-router';

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
  const loaderData = useLoaderData<typeof loader>();
  const { projectId, dnsZoneId } = useParams();
  const revalidator = useRevalidator();
  const tableRef = useRef<DataTableRef<IFlattenedDnsRecord>>(null);
  const dnsRecordModalFormRef = useRef<DnsRecordModalFormRef>(null);

  const { confirm } = useConfirmationDialog();
  const fetcher = useFetcher({ key: 'delete-dns-record' });

  // Local state for DNS records that we can manipulate
  const [dnsRecordSets, setDnsRecordSets] = useState<IFlattenedDnsRecord[]>(loaderData);
  const [currentRecord, setCurrentRecord] = useState<IFlattenedDnsRecord | null>(null);

  // Update local state when loader data changes (e.g., after revalidation)
  useEffect(() => {
    setDnsRecordSets(loaderData);
  }, [loaderData]);

  const handleDelete = async (record: IFlattenedDnsRecord) => {
    await confirm({
      title: 'Delete DNS Record',
      description: (
        <span>
          Are you sure you want to delete the <strong>{record.type}</strong> record for{' '}
          <strong>{record.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      onSubmit: async () => {
        setCurrentRecord(record);
        await fetcher.submit(
          {
            projectId: projectId!,
            recordSetName: record.recordSetName,
            recordName: record.name,
            recordType: record.type,
            value: record.value,
          },
          {
            method: 'DELETE',
            action: DNS_RECORDS_ACTIONS_PATH,
          }
        );
      },
    });
  };

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data?.success) {
        toast.success('DNS record deleted successfully', {
          description: 'The DNS record has been deleted successfully',
        });

        setDnsRecordSets((prev) =>
          prev.filter(
            (r) =>
              r.value !== currentRecord?.value ||
              r.name !== currentRecord?.name ||
              r.ttl !== currentRecord?.ttl
          )
        );
      } else {
        toast.error(fetcher.data?.error);
      }
    }
  }, [fetcher.data, fetcher.state]);

  const handleOnSuccess = (mode: 'create' | 'edit' = 'create') => {
    // Reload data after successful add/save
    toast.success(`DNS record ${mode === 'create' ? 'added' : 'saved'} successfully`, {
      description: `The ${mode === 'create' ? 'DNS record has been added' : 'DNS record has been saved'} successfully`,
    });

    revalidator.revalidate();
  };

  return (
    <>
      <DnsRecordModalForm
        ref={dnsRecordModalFormRef}
        projectId={projectId!}
        dnsZoneId={dnsZoneId!}
        onSuccess={handleOnSuccess}
      />

      <DnsRecordTable
        mode="full"
        data={dnsRecordSets}
        emptyContent={{
          title: 'No DNS records found',
          actions: [
            {
              type: 'button',
              label: 'Add a DNS record',
              onClick: () => dnsRecordModalFormRef.current?.show('create'),
              variant: 'default',
              icon: <ArrowRightIcon className="size-4" />,
              iconPosition: 'end',
            },
          ],
        }}
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
            icon: <PencilIcon className="size-3.5" />,
            display: 'inline',
            triggerInlineEdit: true,
            showLabel: false,
            action: () => {},
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Trash2Icon className="size-3.5" />,
            display: 'inline',
            showLabel: false,
            action: (row) => handleDelete(row),
          },
        ]}
        // Inline form configuration
        enableInlineContent={true}
        inlineContent={({ mode, data, onClose }) => (
          <div className="border-secondary relative rounded-lg border px-7 py-5 shadow-sm">
            <DnsRecordInlineForm
              mode={mode}
              initialData={data}
              projectId={projectId!}
              dnsZoneId={dnsZoneId!}
              onClose={onClose}
              onSuccess={() => handleOnSuccess(mode)}
            />

            <XCircleIcon
              size={20}
              className="fill-secondary/20 text-secondary-foreground hover:fill-secondary hover:text-secondary-foreground absolute top-2 right-2 cursor-pointer transition-all"
              onClick={onClose}
            />
          </div>
        )}
        ref={tableRef}
      />
    </>
  );
}
