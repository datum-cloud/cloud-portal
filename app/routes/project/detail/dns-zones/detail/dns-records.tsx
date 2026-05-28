import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { RestrictedState } from '@/components/restricted-state/restricted-state';
import {
  DnsRecordAiEdgeCell,
  DnsRecordTable,
  getDnsRecordRowId,
  isEligibleForProtect,
} from '@/features/edge/dns-records';
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
import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import { usePermissionCheck, PermissionButton } from '@/modules/rbac';
import {
  IFlattenedDnsRecord,
  dnsRecordKeys,
  useDeleteDnsRecord,
  useDnsRecords,
  useDnsRecordsWatch,
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
import { BadRequestError } from '@/utils/errors';
import { getRecordHostname } from '@/utils/helpers/dns';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
import {
  useDataTablePagination,
  useDataTableSearch,
  type ActionItem,
} from '@datum-cloud/datum-ui/data-table';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { ClientOnly } from '@datum-cloud/datum-ui/theme';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>DNS Records</span>,
};

/**
 * "Add record" button rendered inside the table toolbar.
 *
 * Lives inside `<DataTable.Client>` (via `tableTitle.actions`), so it can
 * reach datum-ui's pagination + search hooks. Before opening the inline
 * create form we reset pageIndex to 0 and clear the search query — the
 * inline panel renders at the top of the *current* paginated/filtered
 * slice, so opening it on page 3 with a search active makes the form
 * appear in a seemingly random row position. Resetting both first
 * guarantees the form lands on the first row of an unfiltered page 1.
 */
function AddDnsRecordButton({ onClick }: { onClick: () => void }) {
  const { setPageIndex } = useDataTablePagination();
  const { clearSearch } = useDataTableSearch();

  const handleClick = () => {
    clearSearch();
    setPageIndex(0);
    onClick();
  };

  return (
    <PermissionButton
      resource="dnsrecordsets"
      verb="create"
      group="dns.networking.miloapis.com"
      namespace="default"
      scope="project"
      deniedReason="You don't have permission to add a DNS record"
      htmlType="button"
      type="primary"
      theme="solid"
      size="small"
      className="min-w-0 flex-1 sm:flex-initial"
      onClick={handleClick}>
      <Icon icon={PlusIcon} className="size-4" />
      Add record
    </PermissionButton>
  );
}

export default function DnsRecordsPage() {
  const { dnsZone } = useRouteLoaderData('dns-zone-detail') as {
    dnsZone: DnsZone;
  };
  const { projectId, dnsZoneId } = useParams();
  if (!projectId || !dnsZoneId) {
    throw new BadRequestError('Project ID and DNS Zone ID are required');
  }

  // DNS records are a separate, permission-gated resource — a zone viewer may
  // lack dnsrecordsets access. Gate the query/watch behind the SSAR so a
  // missing permission never fires the request. The httpproxies·list check
  // gates the AI Edge cell enrichment so a viewer without proxy access doesn't
  // 403 on the optional `findProxyForRecord` lookup.
  const { permissions, isLoading: permLoading } = usePermissionCheck([
    {
      resource: 'dnsrecordsets',
      verb: 'list',
      group: 'dns.networking.miloapis.com',
      namespace: 'default',
      scope: 'project',
    },
    {
      resource: 'dnsrecordsets',
      verb: 'create',
      group: 'dns.networking.miloapis.com',
      namespace: 'default',
      scope: 'project',
    },
    {
      resource: 'dnsrecordsets',
      verb: 'patch',
      group: 'dns.networking.miloapis.com',
      namespace: 'default',
      scope: 'project',
    },
    {
      resource: 'dnsrecordsets',
      verb: 'delete',
      group: 'dns.networking.miloapis.com',
      namespace: 'default',
      scope: 'project',
    },
    {
      resource: 'httpproxies',
      verb: 'list',
      group: 'networking.datumapis.com',
      namespace: 'default',
      scope: 'project',
    },
  ]);
  const { canListRecords, canCreateRecord, canPatchRecord, canDeleteRecord, canListProxies } =
    useMemo(
      () => ({
        canListRecords: permissions['dnsrecordsets:list']?.allowed ?? false,
        canCreateRecord: permissions['dnsrecordsets:create']?.allowed ?? false,
        canPatchRecord: permissions['dnsrecordsets:patch']?.allowed ?? false,
        canDeleteRecord: permissions['dnsrecordsets:delete']?.allowed ?? false,
        canListProxies: permissions['httpproxies:list']?.allowed ?? false,
      }),
      [permissions]
    );

  // Subscribe to watch for real-time updates
  useDnsRecordsWatch(projectId, dnsZoneId, { enabled: canListRecords });

  const { data: queryData = [] } = useDnsRecords(projectId, dnsZoneId, undefined, {
    staleTime: QUERY_STALE_TIME,
    enabled: canListRecords,
  });

  // AI Edge enrichment is optional — only fetch when the user can list proxies
  // (a denied viewer still sees the records table without the linked-proxy cell).
  const { data: proxies = [] } = useHttpProxies(projectId, {
    enabled: canListProxies,
  });

  const dnsRecords = queryData;

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

  const dnsRecordModalFormRef = useRef<DnsRecordModalFormRef>(null);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  // Controlled inline content state (lifted from DnsRecordTable)
  const [inlineOpen, setInlineOpen] = useState(false);
  const [inlinePosition, setInlinePosition] = useState<'top' | 'row'>('top');
  const [inlineRowId, setInlineRowId] = useState<string | undefined>(undefined);

  const handleOpenCreate = () => {
    setInlinePosition('top');
    setInlineRowId(undefined);
    setInlineOpen(true);
  };

  const handleOpenEdit = (record: IFlattenedDnsRecord) => {
    if (!canPatchRecord) {
      toast.error("You don't have permission to edit DNS records");
      return;
    }
    setInlinePosition('row');
    // Must match DnsRecordTable's `getRowId` so only the clicked row
    // (not every row sharing a recordSetName) anchors the inline panel.
    setInlineRowId(getDnsRecordRowId(record));
    setInlineOpen(true);
  };

  const handleOpenEditMobile = (record: IFlattenedDnsRecord) => {
    if (!canPatchRecord) {
      toast.error("You don't have permission to edit DNS records");
      return;
    }
    dnsRecordModalFormRef.current?.show('edit', record);
  };

  const handleInlineClose = () => {
    setInlineOpen(false);
    setInlineRowId(undefined);
  };

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

  // Delete row action (edit is built into DnsRecordTable via onOpenEdit)
  const extraRowActions: ActionItem<IFlattenedDnsRecord>[] = [
    {
      label: 'Delete',
      variant: 'destructive',
      onClick: (record) => handleDelete(record),
      hidden: (record) => !canDeleteRecord || record.type === 'SOA',
      disabled: (record) => isRowLocked(record),
      tooltip: (record) => record.lockReason ?? '',
    },
  ];

  if (!permLoading && !canListRecords) {
    return (
      <RestrictedState
        title="Access restricted"
        message="You don't have permission to view DNS records."
      />
    );
  }

  // Desktop layout is the SSR-safe fallback (inline panel mode)
  // Mobile layout (modal mode) resolves on the client after breakpoint check
  const desktopLayout = (
    <>
      <DnsRecordModalForm
        ref={dnsRecordModalFormRef}
        projectId={projectId!}
        dnsZoneId={dnsZoneId!}
        onSuccess={handleOnSuccess}
      />

      <DnsRecordTable
        mode="full"
        data={enrichedRecords}
        projectId={projectId!}
        dnsZoneId={dnsZoneId!}
        renderAiEdgeCell={(record) => (
          <DnsRecordAiEdgeCell
            record={record}
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
        tableTitle={{
          actions: (
            <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
              {canCreateRecord && (
                <DnsRecordImportAction
                  origin={dnsZone?.domainName}
                  existingRecords={dnsRecords}
                  projectId={projectId!}
                  dnsZoneId={dnsZoneId!}
                  onSuccess={() => {
                    // Watch will automatically update the list with real-time changes
                  }}
                />
              )}
              <AddDnsRecordButton onClick={handleOpenCreate} />
            </div>
          ),
        }}
        inlineOpen={inlineOpen}
        inlinePosition={inlinePosition}
        inlineRowId={inlineRowId}
        onInlineClose={handleInlineClose}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        extraRowActions={extraRowActions}
      />
    </>
  );

  return (
    <ClientOnly fallback={desktopLayout}>
      {isMobile ? (
        <>
          <DnsRecordModalForm
            ref={dnsRecordModalFormRef}
            projectId={projectId!}
            dnsZoneId={dnsZoneId!}
            onSuccess={handleOnSuccess}
          />

          <DnsRecordTable
            mode="full"
            data={enrichedRecords}
            projectId={projectId!}
            dnsZoneId={dnsZoneId!}
            renderAiEdgeCell={(record) => (
              <DnsRecordAiEdgeCell
                record={record}
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
            tableTitle={{
              actions: (
                <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
                  {canCreateRecord && (
                    <DnsRecordImportAction
                      origin={dnsZone?.domainName}
                      existingRecords={dnsRecords}
                      projectId={projectId!}
                      dnsZoneId={dnsZoneId!}
                      onSuccess={() => {
                        // Watch will automatically update the list with real-time changes
                      }}
                    />
                  )}
                  <PermissionButton
                    resource="dnsrecordsets"
                    verb="create"
                    group="dns.networking.miloapis.com"
                    namespace="default"
                    scope="project"
                    deniedReason="You don't have permission to add a DNS record"
                    htmlType="button"
                    type="primary"
                    theme="solid"
                    size="small"
                    className="min-w-0 flex-1 sm:flex-initial"
                    onClick={() => dnsRecordModalFormRef.current?.show('create')}>
                    <Icon icon={PlusIcon} className="size-4" />
                    Add record
                  </PermissionButton>
                </div>
              ),
            }}
            inlineOpen={false}
            inlinePosition={inlinePosition}
            inlineRowId={inlineRowId}
            onInlineClose={handleInlineClose}
            onOpenCreate={handleOpenCreate}
            onOpenEdit={handleOpenEditMobile}
            extraRowActions={extraRowActions}
          />
        </>
      ) : (
        desktopLayout
      )}
    </ClientOnly>
  );
}
