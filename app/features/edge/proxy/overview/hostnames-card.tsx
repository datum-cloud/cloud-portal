import { StatusChip } from '@/components/card/status-chip';
import { ValueRow } from '@/components/card/value-row';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { ProxyHostnamesConfigDialog } from '@/features/edge/proxy/proxy-hostnames-dialog';
import type { ProxyHostnamesConfigDialogRef } from '@/features/edge/proxy/proxy-hostnames-dialog';
import { findZoneForHostname } from '@/features/edge/proxy/utils/delete-dns-preview';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { showMutationErrorToast } from '@/modules/quota';
import { PermissionButton, usePermission } from '@/modules/rbac';
import { ControlPlaneStatus } from '@/resources/base';
import { useDnsZones } from '@/resources/dns-zones';
import {
  type HttpProxy,
  getCertificateReadyCondition,
  getCertificateReadyDisplay,
  getDnsRecordProgrammedCondition,
  getDnsRecordProgrammedDisplay,
  getDnsRecordProgrammedIssue,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { MoreActions, type ActionItem } from '@datum-cloud/datum-ui/more-actions';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import {
  CopyIcon,
  GlobeIcon,
  ListIcon,
  LockIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router';

const EDIT_DENIED = "You don't have permission to edit this Application Load Balancer";

type HostnameRow = {
  hostname: string;
  verified: boolean;
  failedMessage?: string;
  dns: 'programmed' | 'not-applicable' | 'pending';
  dnsMessage?: string;
  /** Set when Datum can't program the record until the user fixes something. */
  dnsIssue?: { label: string; message: string };
  cert: ReturnType<typeof getCertificateReadyDisplay>;
  certMessage?: string;
  /** Records page of the Datum DNS zone that serves this hostname, when we manage it. */
  dnsRecordsHref?: string;
};

export const HttpProxyHostnamesCard = ({
  proxy,
  projectId,
  disabled,
}: {
  proxy?: HttpProxy;
  projectId?: string;
  disabled?: boolean;
}) => {
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();
  const hostnamesConfigDialogRef = useRef<ProxyHostnamesConfigDialogRef>(null);
  const [, copy, isCopied] = useCopyToClipboard();

  const customHostnames = useMemo(() => proxy?.hostnames ?? [], [proxy?.hostnames]);

  const { hasPermission: canPatch, isLoading: patchPermLoading } = usePermission(
    'httpproxies',
    'patch',
    {
      group: 'networking.datumapis.com',
      namespace: 'default',
      scope: 'project',
      projectId,
      enabled: !!projectId,
    }
  );

  // Best-effort: when the zone list is slow or denied the rows still render,
  // they just lose the "View DNS records" link.
  const { data: zones = [] } = useDnsZones(projectId ?? '', undefined, {
    staleTime: QUERY_STALE_TIME,
    retry: false,
    enabled: !!projectId && customHostnames.length > 0,
  });

  const updateProxy = useUpdateHttpProxy(projectId ?? '', proxy?.name ?? '');

  const rows = useMemo<HostnameRow[]>(() => {
    const statuses = proxy?.hostnameStatuses ?? [];
    return customHostnames.map((hostname) => {
      const hostnameStatus = statuses.find((hs) => hs.hostname === hostname);
      const available = hostnameStatus?.conditions?.find((c) => c.type === 'Available');
      const dnsCondition = getDnsRecordProgrammedCondition(hostnameStatus);
      const certCondition = getCertificateReadyCondition(hostnameStatus);
      const zone = projectId ? findZoneForHostname(zones, hostname) : undefined;

      return {
        hostname,
        verified: available?.status === 'True',
        failedMessage: available?.status === 'False' ? available.message : undefined,
        dns: getDnsRecordProgrammedDisplay(dnsCondition),
        dnsMessage: dnsCondition?.message,
        dnsIssue: getDnsRecordProgrammedIssue(dnsCondition),
        cert: getCertificateReadyDisplay(certCondition),
        certMessage: certCondition?.message,
        dnsRecordsHref:
          zone && projectId
            ? getPathWithParams(paths.project.detail.dnsZones.detail.dnsRecords, {
                projectId,
                dnsZoneId: zone.name,
              })
            : undefined,
      };
    });
  }, [customHostnames, proxy?.hostnameStatuses, zones, projectId]);

  const systemHostname = proxy?.canonicalHostname ?? proxy?.status?.hostnames?.[0];
  const proxyStatus = useMemo(
    () => (proxy?.status ? transformControlPlaneStatus(proxy.status) : undefined),
    [proxy?.status]
  );

  const removeHostname = async (hostname: string) => {
    if (!proxy) return;
    await confirm({
      title: 'Remove hostname',
      description: (
        <span>
          Stop serving this load balancer on <strong>{hostname}</strong>? Any DNS record Datum
          created for it is removed; records you manage yourself are left in place.
        </span>
      ),
      submitText: 'Remove',
      cancelText: 'Cancel',
      variant: 'destructive',
      onSubmit: async () => {
        try {
          await updateProxy.mutateAsync({
            hostnames: customHostnames.filter((value) => value !== hostname),
          });
          toast.success('Application Load Balancer', {
            description: `${hostname} removed`,
          });
        } catch (error) {
          showMutationErrorToast(error, {
            fallbackTitle: 'Application Load Balancer',
            fallbackDescription: (error as Error).message || 'Failed to remove hostname',
            scope: 'project',
            projectId,
          });
          throw error;
        }
      },
    });
  };

  const rowActions: ActionItem<HostnameRow>[] = [
    {
      key: 'copy',
      label: 'Copy hostname',
      icon: <Icon icon={CopyIcon} className="size-4" />,
      onClick: (row) => void copy(row.hostname, { withToast: true }),
    },
    {
      key: 'dns',
      label: 'View DNS records',
      icon: <Icon icon={ListIcon} className="size-4" />,
      hidden: (row) => !row.dnsRecordsHref,
      onClick: (row) => {
        if (row.dnsRecordsHref) void navigate(row.dnsRecordsHref);
      },
    },
    {
      key: 'remove',
      label: 'Remove hostname',
      icon: <Icon icon={Trash2Icon} className="size-4" />,
      variant: 'destructive',
      disabled: !canPatch || patchPermLoading || !!disabled,
      tooltip: () => (!canPatch && !patchPermLoading ? EDIT_DENIED : 'Remove hostname'),
      onClick: (row) => void removeHostname(row.hostname),
    },
  ];

  return (
    <Card size="sm" sectioned className="w-full overflow-hidden" data-e2e="alb-hostnames-card">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={GlobeIcon} size={16} className="text-secondary" />
          Custom Hostnames
        </CardTitle>
        <CardAction>
          <PermissionButton
            resource="httpproxies"
            verb="patch"
            group="networking.datumapis.com"
            namespace="default"
            scope="project"
            projectId={projectId}
            deniedReason={EDIT_DENIED}
            type="secondary"
            theme="outline"
            size="xs"
            className="shrink-0"
            onClick={() => {
              if (proxy) {
                hostnamesConfigDialogRef.current?.show(proxy);
              }
            }}
            disabled={disabled}>
            <Icon icon={PlusIcon} size={12} />
            {rows.length > 0 ? 'Add hostname' : 'Add custom hostname'}
          </PermissionButton>
        </CardAction>
      </CardHeader>
      <CardContent padding="none">
        <div>
          {rows.length === 0 ? (
            <div className="text-muted-foreground border-card-border mx-(--card-px) border-b py-3.5 text-sm">
              No custom hostnames yet. Requests are served on the default hostname until you attach
              your own domain.
            </div>
          ) : null}

          {rows.map((row) => (
            <ValueRow
              key={row.hostname}
              value={row.hostname}
              copied={isCopied(row.hostname)}
              onCopy={() => void copy(row.hostname, { withToast: true })}
              status={
                <>
                  {row.verified ? (
                    <StatusChip tone="success" tooltip="Hostname ownership verified by Datum">
                      Verified
                    </StatusChip>
                  ) : row.failedMessage ? (
                    <StatusChip tone="danger" tooltip={row.failedMessage}>
                      Unverified
                    </StatusChip>
                  ) : (
                    <StatusChip tone="warning" busy tooltip="Waiting for ownership verification">
                      Verifying
                    </StatusChip>
                  )}

                  {row.dnsIssue ? (
                    <StatusChip tone="danger" tooltip={row.dnsIssue.message}>
                      <Icon icon={TriangleAlertIcon} size={11} aria-hidden="true" />
                      {row.dnsIssue.label}
                    </StatusChip>
                  ) : row.dns === 'programmed' ? (
                    <StatusChip
                      tone="success"
                      tooltip="Datum programmed the DNS record for this hostname">
                      DNS Ready
                    </StatusChip>
                  ) : row.dns === 'not-applicable' ? (
                    <StatusChip
                      tone="muted"
                      tooltip="This hostname isn't in a Datum DNS zone, so you manage its DNS yourself">
                      External DNS
                    </StatusChip>
                  ) : (
                    <StatusChip
                      tone="warning"
                      busy
                      tooltip={row.dnsMessage || 'Waiting for the DNS record to be programmed'}>
                      Pending DNS
                    </StatusChip>
                  )}

                  {row.cert === 'ready' ? (
                    <StatusChip tone="success" tooltip="TLS certificate issued and ready">
                      TLS Ready
                    </StatusChip>
                  ) : row.cert === 'failed' ? (
                    <StatusChip
                      tone="danger"
                      tooltip={row.certMessage || 'TLS certificate provisioning failed'}>
                      TLS Failed
                    </StatusChip>
                  ) : row.cert === 'challenge' ? (
                    <StatusChip
                      tone="warning"
                      busy
                      tooltip={
                        row.certMessage ||
                        'Completing ACME challenge with the certificate authority'
                      }>
                      ACME challenge
                    </StatusChip>
                  ) : (
                    <StatusChip
                      tone="warning"
                      busy
                      tooltip={row.certMessage || 'Requesting a TLS certificate'}>
                      Issuing TLS
                    </StatusChip>
                  )}

                  {row.dns === 'pending' && row.dnsRecordsHref ? (
                    // Covers both "still programming" and actionable issues — a conflict
                    // is resolved on the zone's records page.
                    <Button
                      asChild
                      type="secondary"
                      theme="outline"
                      size="xs"
                      className="h-6 gap-1 px-2 text-[11px]">
                      <Link to={row.dnsRecordsHref}>
                        <Icon icon={ListIcon} size={12} aria-hidden="true" />
                        View DNS records
                      </Link>
                    </Button>
                  ) : null}
                </>
              }
              action={
                <MoreActions
                  row={row}
                  actions={rowActions}
                  sheetTitle={`Actions for ${row.hostname}`}
                  className="size-7"
                  iconClassName="size-4"
                />
              }
            />
          ))}

          {systemHostname ? (
            <ValueRow
              value={systemHostname}
              copied={isCopied(systemHostname)}
              onCopy={() => void copy(systemHostname, { withToast: true })}
              status={
                <>
                  <StatusChip tone="muted" tooltip="Issued and managed by Datum">
                    <Icon icon={LockIcon} size={10} aria-hidden="true" />
                    Default
                  </StatusChip>
                  {proxyStatus?.status === ControlPlaneStatus.Success ? (
                    <StatusChip tone="success" tooltip="Serving traffic on the default hostname">
                      Active
                    </StatusChip>
                  ) : proxyStatus?.status === ControlPlaneStatus.Error ? (
                    <StatusChip
                      tone="danger"
                      tooltip={proxyStatus.message || 'The load balancer reported an error'}>
                      Error
                    </StatusChip>
                  ) : (
                    <StatusChip
                      tone="warning"
                      busy
                      tooltip={proxyStatus?.message || 'The load balancer is being provisioned'}>
                      Provisioning
                    </StatusChip>
                  )}
                </>
              }
              action={
                <Tooltip message="The default hostname is managed by Datum and can't be removed">
                  <span className="text-muted-foreground inline-flex size-7 items-center justify-center">
                    <Icon icon={LockIcon} size={14} aria-hidden="true" />
                  </span>
                </Tooltip>
              }
            />
          ) : null}
        </div>
      </CardContent>
      {proxy && projectId && (
        <ProxyHostnamesConfigDialog ref={hostnamesConfigDialogRef} projectId={projectId} />
      )}
    </Card>
  );
};
