import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DnsRecordTable } from '@/features/edge/dns-records';
import { DnsRecordInlineForm } from '@/features/edge/dns-records/dns-record-inline-form';
import {
  DnsRecordModalForm,
  DnsRecordModalFormRef,
} from '@/features/edge/dns-records/dns-record-modal-form';
import { DnsRecordImportAction } from '@/features/edge/dns-records/import-export/dns-record-import-action';
import { DataTableFilter, DataTableRef } from '@/modules/datum-ui/components/data-table';
import {
  DNS_RECORD_TYPES,
  IFlattenedDnsRecord,
  useDeleteDnsRecord,
  useDnsRecords,
  useDnsRecordsWatch,
  useHydrateDnsRecords,
} from '@/resources/dns-records';
import type { DnsZone } from '@/resources/dns-zones';
import { Button, toast } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ArrowRightIcon, PencilIcon, PlusIcon, Trash2Icon, XCircleIcon } from 'lucide-react';
import { useRef } from 'react';
import { useParams, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>DNS Records</span>,
};

export default function DnsRecordsPage() {
  const { dnsZone, dnsRecordSets: initialDnsRecordSets } = useRouteLoaderData(
    'dns-zone-detail'
  ) as {
    dnsZone: DnsZone;
    dnsRecordSets: IFlattenedDnsRecord[];
  };
  const { projectId, dnsZoneId } = useParams();

  // Hydrate cache with SSR data (runs once on mount)
  useHydrateDnsRecords(projectId ?? '', dnsZoneId ?? '', initialDnsRecordSets);

  // Subscribe to watch for real-time updates
  useDnsRecordsWatch(projectId ?? '', dnsZoneId ?? '');

  // Read from React Query cache (gets updates from watch!)
  const { data: queryData } = useDnsRecords(projectId ?? '', dnsZoneId, undefined, {
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  // Use React Query data, fallback to SSR data
  const dnsRecords = queryData ?? initialDnsRecordSets;

  const tableRef = useRef<DataTableRef<IFlattenedDnsRecord>>(null);
  const dnsRecordModalFormRef = useRef<DnsRecordModalFormRef>(null);

  const { confirm } = useConfirmationDialog();
  const deleteMutation = useDeleteDnsRecord(projectId!, dnsZoneId!, {
    onSuccess: () => {
      toast.success('DNS record deleted successfully', {
        description: 'The DNS record has been deleted successfully',
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete DNS record');
    },
  });

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
        if (record.recordSetName) {
          deleteMutation.mutate({
            recordSetName: record.recordSetName,
            recordType: record.type,
            name: record.name,
            value: record.value,
            ttl: record.ttl,
          });
        }
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
    // Watch will automatically update the list with real-time changes
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
        enableShowAll={true}
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
              icon: <Icon icon={ArrowRightIcon} className="size-4" />,
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
                onSuccess={() => {
                  // Watch will automatically update the list with real-time changes
                }}
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
                <Icon icon={PlusIcon} className="size-4" />
                Add record
              </Button>
            </div>
          ),
        }}
        rowActions={[
          {
            key: 'edit',
            label: 'Edit',
            icon: <Icon icon={PencilIcon} className="size-3.5" />,
            display: 'inline',
            triggerInlineEdit: true,
            showLabel: false,
            action: () => {},
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Icon icon={Trash2Icon} className="size-3.5" />,
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
          showRowCount: true,
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
          <div className="border-secondary relative rounded-lg border px-7 py-5 shadow">
            <DnsRecordInlineForm
              mode={mode}
              initialData={data}
              projectId={projectId!}
              dnsZoneId={dnsZoneId!}
              onClose={onClose}
              onSuccess={() => handleOnSuccess(mode)}
            />

            <Icon
              icon={XCircleIcon}
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
