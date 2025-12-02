import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DnsRecordTable } from '@/features/edge/dns-zone/overview/dns-records';
import { DnsRecordInlineForm } from '@/features/edge/dns-zone/overview/dns-records/dns-record-inline-form';
import {
  DnsRecordModalForm,
  DnsRecordModalFormRef,
} from '@/features/edge/dns-zone/overview/dns-records/dns-record-modal-form';
import { DnsRecordImportAction } from '@/features/edge/dns-zone/overview/dns-records/import-export/dns-record-import-action';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { DataTableFilter, DataTableRef } from '@/modules/datum-ui/components/data-table';
import { IDnsZoneControlResponse, IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { DNS_RECORD_TYPES } from '@/resources/schemas/dns-record.schema';
import { ROUTE_PATH as DNS_RECORDS_ACTIONS_PATH } from '@/routes/api/dns-records';
import { Button, toast } from '@datum-ui/components';
import { ArrowRightIcon, PencilIcon, PlusIcon, Trash2Icon, XCircleIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRevalidator, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>DNS Records</span>,
};

export default function DnsRecordsPage() {
  const { dnsZone, dnsRecordSets } = useRouteLoaderData('dns-zone-detail') as {
    dnsZone: IDnsZoneControlResponse;
    dnsRecordSets: IFlattenedDnsRecord[];
  };
  const { projectId, dnsZoneId } = useParams();
  const revalidator = useRevalidator();
  const tableRef = useRef<DataTableRef<IFlattenedDnsRecord>>(null);
  const dnsRecordModalFormRef = useRef<DnsRecordModalFormRef>(null);

  const { confirm } = useConfirmationDialog();
  const deleteFetcher = useDatumFetcher({
    key: 'delete-dns-record',
    onSuccess: () => {
      toast.success('DNS record deleted successfully', {
        description: 'The DNS record has been deleted successfully',
      });

      setDnsRecords((prev) =>
        prev.filter(
          (r) =>
            r.value !== currentRecord?.value ||
            r.name !== currentRecord?.name ||
            r.ttl !== currentRecord?.ttl
        )
      );
    },
    onError: (data) => {
      toast.error(data.error || 'Failed to delete DNS record');
    },
  });

  // Local state for DNS records that we can manipulate
  const [dnsRecords, setDnsRecords] = useState<IFlattenedDnsRecord[]>(dnsRecordSets);
  const [currentRecord, setCurrentRecord] = useState<IFlattenedDnsRecord | null>(null);

  // Update local state when loader data changes (e.g., after revalidation)
  useEffect(() => {
    setDnsRecords(dnsRecordSets);
  }, [dnsRecordSets]);

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
        await deleteFetcher.submit(
          {
            projectId: projectId!,
            recordSetName: record.recordSetName,
            recordName: record.name ?? '',
            recordType: record.type ?? '',
            value: record.value ?? '',
          } as unknown as FormData,
          {
            method: 'DELETE',
            action: DNS_RECORDS_ACTIONS_PATH,
          }
        );
      },
    });
  };

  const handleOnSuccess = (mode: 'create' | 'edit' = 'create') => {
    if (mode === 'create') {
      toast.success('DNS record submitted. Validating…', {
        description: 'The DNS record is being validated by the DNS server.',
      });
    } else {
      toast.success('DNS record updated. Validating…', {
        description: 'The DNS record changes are being validated by the DNS server.',
      });
    }

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
        ref={tableRef}
        mode="full"
        data={dnsRecords}
        projectId={projectId!}
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
            <div className="flex items-center justify-end gap-3">
              <DnsRecordImportAction
                origin={dnsZone?.domainName}
                existingRecords={dnsRecords}
                projectId={projectId!}
                dnsZoneId={dnsZoneId!}
                onSuccess={revalidator.revalidate}
              />
              <Button
                htmlType="button"
                type="primary"
                theme="solid"
                size="small"
                onClick={() =>
                  dnsRecords.length > 0
                    ? tableRef.current?.openCreate()
                    : dnsRecordModalFormRef.current?.show('create')
                }>
                <PlusIcon className="size-4" />
                Add record
              </Button>
            </div>
          ),
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
        // Toolbar configuration
        toolbar={{
          layout: 'compact',
          includeSearch: {
            placeholder: 'Search DNS records',
          },
          filtersDisplay: 'dropdown',
        }}
        filters={
          <>
            <DataTableFilter.Tag
              label="Record Type"
              filterKey="type"
              options={DNS_RECORD_TYPES.map((type) => ({
                label: type,
                value: type,
              }))}
            />
          </>
        }
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
      />
    </>
  );
}
