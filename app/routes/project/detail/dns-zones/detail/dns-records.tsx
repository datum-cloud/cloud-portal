import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import {
  DnsRecordAiEdgeCell,
  DnsRecordTable,
  isEligibleForProtect,
} from '@/features/edge/dns-records';
import { DnsRecordInlineForm } from '@/features/edge/dns-records/dns-record-inline-form';
import {
  DnsRecordModalForm,
  DnsRecordModalFormRef,
} from '@/features/edge/dns-records/dns-record-modal-form';
import { DnsRecordImportAction } from '@/features/edge/dns-records/import-export/dns-record-import-action';
import {
  findProxyByEndpoint,
  findProxyForRecord,
  isRowLocked,
} from '@/features/edge/dns-records/utils';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { DataTableFilter, DataTableRef } from '@/modules/datum-ui/components/data-table';
import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import {
  DNS_RECORD_TYPES,
  IFlattenedDnsRecord,
  dnsRecordKeys,
  useDeleteDnsRecord,
  useDnsRecords,
  useDnsRecordsWatch,
  useHydrateDnsRecords,
} from '@/resources/dns-records';
import type { DnsZone } from '@/resources/dns-zones';
import {
  type HttpProxy,
  type UpdateHttpProxyInput,
  createHttpProxyService,
  httpProxyKeys,
  useCreateHttpProxy,
  useHttpProxies,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getRecordHostname } from '@/utils/helpers/dns';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRightIcon, PencilIcon, PlusIcon, Trash2Icon, XCircleIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useRouteLoaderData } from 'react-router';

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
    staleTime: QUERY_STALE_TIME,
  });

  const { data: proxies = [] } = useHttpProxies(projectId ?? '');

  // Use React Query data, fallback to SSR data
  const dnsRecords = queryData ?? initialDnsRecordSets;

  const zoneDomain = dnsZone?.domainName ?? '';
  const enrichedRecords = useMemo((): IFlattenedDnsRecord[] => {
    return dnsRecords.map((record) => {
      const hostname = getRecordHostname(record.name ?? '', zoneDomain);
      // Match by hostname AND origin so the correct proxy is shown when multiple proxies use the same hostname.
      const matchingProxy = findProxyForRecord(proxies, record, hostname, (r) =>
        isEligibleForProtect(r.type)
      );
      const hasProxyForThisRecord = !!matchingProxy && !record.managedByGateway;
      const linkedProxyId = matchingProxy?.name;
      const lockReason = record.managedByGateway
        ? 'Managed by AI Edge'
        : hasProxyForThisRecord
          ? 'Protected by AI Edge'
          : undefined;
      return {
        ...record,
        hasProxyForThisRecord,
        linkedProxyId,
        lockReason,
      };
    });
  }, [dnsRecords, zoneDomain, proxies]);

  const tableRef = useRef<DataTableRef<IFlattenedDnsRecord>>(null);
  const dnsRecordModalFormRef = useRef<DnsRecordModalFormRef>(null);
  const breakpoint = useBreakpoint();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const isMobile = isMounted && breakpoint === 'mobile';

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { trackAction } = useAnalytics();

  const { confirm } = useConfirmationDialog();
  const deleteMutation = useDeleteDnsRecord(projectId!, dnsZoneId!, {
    onError: (error) => {
      toast.error(error.message || 'Failed to delete DNS record');
    },
  });

  const createProxyMutation = useCreateHttpProxy(projectId!, {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dnsRecordKeys.list(projectId!, dnsZoneId),
      });
      trackAction(AnalyticsAction.AddProxy);
      toast.success('AI Edge created', {
        description: 'DNS will update shortly.',
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create AI Edge');
    },
  });

  const addHostnameToProxyMutation = useMutation({
    mutationFn: ({
      name,
      input,
      currentProxy,
    }: {
      name: string;
      input: UpdateHttpProxyInput;
      currentProxy?: HttpProxy;
      hostname?: string;
      removalTitle?: string;
      removalDescription?: string;
    }) =>
      createHttpProxyService().update(projectId!, name, input, {
        currentProxy,
      }) as Promise<HttpProxy>,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: httpProxyKeys.list(projectId!) });
      queryClient.invalidateQueries({
        queryKey: httpProxyKeys.detail(projectId!, variables.name),
      });
      queryClient.invalidateQueries({
        queryKey: dnsRecordKeys.list(projectId!, dnsZoneId),
      });
      if (variables.removalTitle) {
        toast.success(variables.removalTitle, {
          description: variables.removalDescription,
        });
      } else {
        trackAction(AnalyticsAction.AddProxy);
        toast.success('Hostname added to AI Edge', {
          description: variables.hostname
            ? `"${variables.hostname}" was added to an existing proxy. DNS will update shortly.`
            : 'DNS will update shortly.',
        });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add hostname to AI Edge');
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

  const handleProtectWithEdge = async (record: IFlattenedDnsRecord) => {
    const hostname = getRecordHostname(record.name ?? '', zoneDomain);
    const backendHost = record.value.replace(/\.$/, '');
    const resourceName = generateId(hostname, {
      randomText: generateRandomString(6),
      randomLength: 6,
    });

    // A/AAAA = IP origin: HTTPS to origin not supported, use HTTP (enhancement #613)
    const isIpOrigin = record.type === 'A' || record.type === 'AAAA';
    const endpoint = isIpOrigin ? `http://${backendHost}` : `https://${backendHost}`;

    try {
      const proxies = await queryClient.fetchQuery({
        queryKey: httpProxyKeys.list(projectId!),
        queryFn: () => createHttpProxyService().list(projectId!),
      });
      const existingProxy = findProxyByEndpoint(proxies, endpoint);

      if (existingProxy) {
        const currentHostnames = existingProxy.hostnames ?? [];
        if (currentHostnames.includes(hostname)) {
          toast.info('Already protected', {
            description: `"${hostname}" is already on this AI Edge.`,
          });
          return;
        }
        const newHostnames = [...currentHostnames, hostname];
        await addHostnameToProxyMutation.mutateAsync({
          name: existingProxy.name,
          input: { hostnames: newHostnames },
          currentProxy: existingProxy,
          hostname,
        });
      } else {
        await createProxyMutation.mutateAsync({
          name: resourceName,
          chosenName: hostname,
          endpoint,
          hostnames: [hostname],
          trafficProtectionMode: 'Enforce',
          paranoiaLevels: { blocking: 1 },
          enableHttpRedirect: true,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to protect with AI Edge';
      toast.error(message);
    }
  };

  const handleRemoveEdge = async (
    record: IFlattenedDnsRecord,
    callbacks?: { onMutationStart?: () => void }
  ) => {
    const proxyId = record.linkedProxyId;
    if (!proxyId) return;
    const hostname = getRecordHostname(record.name ?? '', zoneDomain);
    await confirm({
      title: 'Remove AI Edge protection',
      description: (
        <span>
          This will remove <strong>{hostname}</strong> from the AI Edge. Traffic to this hostname
          will no longer be protected. The AI Edge proxy will be left in place for any other
          hostnames it serves.
        </span>
      ),
      submitText: 'Remove',
      cancelText: 'Cancel',
      variant: 'destructive',
      onSubmit: async () => {
        callbacks?.onMutationStart?.();
        const proxy = await queryClient.fetchQuery({
          queryKey: httpProxyKeys.detail(projectId!, proxyId),
          queryFn: () => createHttpProxyService().get(projectId!, proxyId),
        });
        const normalizedHostname = hostname.toLowerCase();
        const newHostnames = (proxy.hostnames ?? []).filter(
          (h) => h?.replace(/\.$/, '').toLowerCase() !== normalizedHostname
        );
        await addHostnameToProxyMutation.mutateAsync({
          name: proxyId,
          input: { hostnames: newHostnames },
          currentProxy: proxy,
          removalTitle: 'Hostname removed from AI Edge',
          removalDescription: 'The AI Edge proxy remains in place. DNS will update shortly.',
        });
      },
    });
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
        data={enrichedRecords}
        projectId={projectId!}
        renderAiEdgeCell={(row) => (
          <DnsRecordAiEdgeCell
            record={row}
            zoneDomain={zoneDomain}
            onProtect={handleProtectWithEdge}
            onRemove={handleRemoveEdge}
            onViewProxy={(proxyId) =>
              navigate(
                getPathWithParams(paths.project.detail.proxy.detail.root, {
                  projectId: projectId!,
                  proxyId,
                })
              )
            }
          />
        )}
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
            <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
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
                className="min-w-0 flex-1 sm:flex-initial"
                onClick={() =>
                  dnsRecords.length > 0
                    ? isMobile
                      ? dnsRecordModalFormRef.current?.show('create')
                      : tableRef.current?.openCreate()
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
            triggerInlineEdit: !isMobile,
            showLabel: false,
            action: (row) => {
              if (isMobile) dnsRecordModalFormRef.current?.show('edit', row);
            },
            /**
             * TODO: SOA records are not editable
             * @see https://github.com/datum-cloud/cloud-portal/issues/901
             */
            hidden: (row) => row.type === 'SOA',
            disabled: (row) => isRowLocked(row),
            tooltip: (row) => (row.lockReason ? `${row.lockReason}` : undefined),
          },
          {
            key: 'delete',
            label: 'Delete',
            icon: <Icon icon={Trash2Icon} className="size-3.5" />,
            display: 'inline',
            variant: 'destructive',
            showLabel: false,
            action: (row) => handleDelete(row),
            /**
             * TODO: SOA records are not deletable
             * @see https://github.com/datum-cloud/cloud-portal/issues/901
             */
            hidden: (row) => row.type === 'SOA',
            disabled: (row) => isRowLocked(row),
            tooltip: (row) => (row.lockReason ? `${row.lockReason}` : undefined),
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
        enableInlineContent={!isMobile}
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
