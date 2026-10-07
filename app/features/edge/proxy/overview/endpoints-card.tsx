import { StatusChip } from '@/components/card/status-chip';
import {
  ProxyZoneRecordsWatch,
  useProxyZoneRecords,
} from '@/features/edge/proxy/hooks/use-proxy-zone-records';
import {
  ProxyHostnamesConfigDialog,
  type ProxyHostnamesConfigDialogRef,
} from '@/features/edge/proxy/proxy-hostnames-dialog';
import { findZoneForHostname } from '@/features/edge/proxy/utils/delete-dns-preview';
import { resolveHostnameDnsIssue } from '@/features/edge/proxy/utils/hostname-dns-issue';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { usePermission } from '@/modules/rbac';
import {
  type HttpProxy,
  HTTP_PROXY_PROVISIONING_POLL_MS,
  WILDCARD_NOT_ENABLED_MESSAGE,
  getCertificateReadyCondition,
  getCertificateReadyDisplay,
  getDnsRecordProgrammedCondition,
  getDnsRecordProgrammedDisplay,
  getHostnameOwnershipDisplay,
  getRecordsToPublish,
  isCertificateAwaitingDnsRecord,
  isHostnameDnsInFlight,
  isHostnameOwnershipBlocked,
} from '@/resources/http-proxies';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CheckIcon, CopyIcon, ExternalLinkIcon, PlusIcon, TriangleAlertIcon } from 'lucide-react';
import { useMemo, useRef, type ReactNode } from 'react';

interface HttpProxyEndpointsCardProps {
  proxy: HttpProxy;
  projectId: string;
}

const ADD_HOSTNAME_DENIED = "You don't have permission to edit this Application Load Balancer";

function AddHostnameButton({ projectId, onClick }: { projectId: string; onClick: () => void }) {
  const { hasPermission, isLoading } = usePermission('httpproxies', 'patch', {
    group: 'networking.datumapis.com',
    namespace: 'default',
    scope: 'project',
    projectId,
  });
  const denied = !isLoading && !hasPermission;
  const button = (
    <button
      type="button"
      disabled={denied}
      onClick={onClick}
      className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline disabled:opacity-50"
      data-e2e="alb-endpoints-add-hostname">
      <Icon icon={PlusIcon} size={12} aria-hidden="true" />
      Add hostname
    </button>
  );
  return denied ? <Tooltip message={ADD_HOSTNAME_DENIED}>{button}</Tooltip> : button;
}

function EndpointRow({
  value,
  chips,
  onCopy,
  copied,
}: {
  value: string;
  chips: ReactNode;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <li className="group/row flex flex-col gap-1.5 px-(--card-px) py-3">
      <div className="flex min-w-0 items-center gap-2">
        <Text as="div" ellipsis className="min-w-0 flex-1 font-mono">
          <Tooltip message={value}>
            <span>{value}</span>
          </Tooltip>
        </Text>
        {onCopy ? (
          <Button
            type="quaternary"
            theme="borderless"
            size="xs"
            className={cn(
              'text-muted-foreground size-6 shrink-0 p-0 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100',
              copied && 'opacity-100'
            )}
            aria-label={`Copy ${value}`}
            onClick={onCopy}>
            <Icon icon={copied ? CheckIcon : CopyIcon} size={12} />
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">{chips}</div>
    </li>
  );
}

/**
 * Hostname summary: the default (Datum-managed) hostname up top and custom
 * hostnames with their programming state below it. Adding a hostname opens the
 * hostnames dialog; everything else is edited on the Configuration tab.
 */
export function HttpProxyEndpointsCard({ proxy, projectId }: HttpProxyEndpointsCardProps) {
  const [, copy, isCopied] = useCopyToClipboard();
  const hostnamesDialogRef = useRef<ProxyHostnamesConfigDialogRef>(null);

  const customHostnames = useMemo(() => proxy.hostnames ?? [], [proxy.hostnames]);
  const pollZoneRecords = useRef(true);
  const dnsInFlight = useMemo(
    () =>
      customHostnames.some((hostname) =>
        isHostnameDnsInFlight(
          getDnsRecordProgrammedCondition(
            proxy.hostnameStatuses?.find((entry) => entry.hostname === hostname)
          )
        )
      ),
    [customHostnames, proxy.hostnameStatuses]
  );
  const { matchedZones, zoneRecords } = useProxyZoneRecords(projectId, customHostnames, {
    refetchInterval: () =>
      dnsInFlight && pollZoneRecords.current ? HTTP_PROXY_PROVISIONING_POLL_MS : false,
  });

  const hostnames = useMemo(() => {
    const statuses = proxy.hostnameStatuses ?? [];
    return customHostnames.map((hostname) => {
      const hostnameStatus = statuses.find((hs) => hs.hostname === hostname);
      const dnsCondition = getDnsRecordProgrammedCondition(hostnameStatus);
      const certCondition = getCertificateReadyCondition(hostnameStatus);
      const dns = getDnsRecordProgrammedDisplay(dnsCondition);
      const ownership = getHostnameOwnershipDisplay(hostnameStatus);
      return {
        hostname,
        ownership,
        blocked: isHostnameOwnershipBlocked(ownership),
        recordsToPublish: getRecordsToPublish(hostnameStatus, {
          inDatumZone: !!findZoneForHostname(matchedZones, hostname) && dns !== 'not-applicable',
        }).length,
        dns,
        dnsIssue: resolveHostnameDnsIssue({
          hostname,
          dns,
          condition: dnsCondition,
          proxyName: proxy.name,
          zoneRecords,
        }),
        cert: getCertificateReadyDisplay(certCondition),
        certAwaitingDns: isCertificateAwaitingDnsRecord(hostnameStatus),
        certMessage: certCondition?.message,
      };
    });
  }, [customHostnames, proxy.hostnameStatuses, proxy.name, zoneRecords, matchedZones]);

  pollZoneRecords.current = hostnames.some(
    (item) => item.dns === 'pending' && !item.dnsIssue && !item.blocked
  );

  const systemHostname = proxy.canonicalHostname ?? proxy.status?.hostnames?.[0];

  return (
    <Card
      size="sm"
      sectioned
      className="flex h-full flex-col overflow-hidden border-0"
      data-e2e="alb-endpoints">
      <CardContent padding="none" className="flex min-h-0 flex-1 flex-col">
        {/* The default hostname is what most users need, so it leads and stays
            pinned; custom hostnames scroll beneath it. */}
        <div className="border-border flex shrink-0 flex-col gap-2 border-b px-(--card-px) py-4">
          <Text size="5xs" weight="medium" textColor="muted" className="tracking-wide uppercase">
            Default hostname
          </Text>
          {systemHostname ? (
            <div className="flex min-w-0 items-center gap-1">
              <Text
                as="div"
                size="base"
                weight="medium"
                ellipsis
                className="min-w-0 flex-1 font-mono"
                data-e2e="alb-endpoints-default-hostname">
                <Tooltip message={systemHostname}>
                  <span>{systemHostname}</span>
                </Tooltip>
              </Text>
              <Button
                type="quaternary"
                theme="borderless"
                size="xs"
                className="text-muted-foreground size-7 shrink-0 p-0"
                aria-label={`Copy ${systemHostname}`}
                onClick={() => copy(systemHostname, { withToast: true })}>
                <Icon icon={isCopied(systemHostname) ? CheckIcon : CopyIcon} size={14} />
              </Button>
              <Tooltip message="Open in a new tab">
                <a
                  href={`https://${systemHostname}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${systemHostname} in a new tab`}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-7 shrink-0 items-center justify-center rounded-md transition-colors">
                  <Icon icon={ExternalLinkIcon} size={14} />
                </a>
              </Tooltip>
            </div>
          ) : (
            <Text size="sm" textColor="muted">
              Appears once the load balancer is programmed.
            </Text>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 px-(--card-px) pt-3">
          <Text size="5xs" weight="medium" textColor="muted" className="tracking-wide uppercase">
            Custom hostnames{hostnames.length > 0 ? ` · ${hostnames.length}` : ''}
          </Text>
          <AddHostnameButton
            projectId={projectId}
            onClick={() => hostnamesDialogRef.current?.show(proxy)}
          />
        </div>
        {/* Capped so a long hostname list scrolls instead of pushing the
            backend pool and request feed down. */}
        <ul className="divide-border flex max-h-72 min-h-0 flex-1 flex-col divide-y overflow-y-auto overscroll-contain">
          {hostnames.length === 0 ? (
            <li className="px-(--card-px) pt-1.5 pb-3">
              <Text size="xs" textColor="muted">
                Serve this load balancer on your own domain.
              </Text>
            </li>
          ) : null}
          {hostnames.map((item) => (
            <EndpointRow
              key={item.hostname}
              value={item.hostname}
              copied={isCopied(item.hostname)}
              onCopy={() => copy(item.hostname, { withToast: true })}
              chips={
                <>
                  {item.ownership.state === 'verified' ? (
                    <StatusChip tone="success" tooltip="Hostname ownership verified">
                      Verified
                    </StatusChip>
                  ) : item.ownership.state === 'verifying' ? (
                    <StatusChip
                      tone="warning"
                      busy
                      tooltip={item.ownership.message || 'Waiting for ownership verification'}>
                      Verifying
                    </StatusChip>
                  ) : (
                    <StatusChip tone="danger" tooltip={item.ownership.message}>
                      {item.ownership.label}
                    </StatusChip>
                  )}
                  {item.blocked ? (
                    <StatusChip
                      tone="muted"
                      tooltip="Datum programs DNS and issues the TLS certificate once ownership is sorted">
                      DNS & TLS on hold
                    </StatusChip>
                  ) : null}
                  {item.blocked ? null : item.dnsIssue ? (
                    <StatusChip tone="danger" tooltip={item.dnsIssue.message}>
                      <Icon icon={TriangleAlertIcon} size={11} aria-hidden="true" />
                      {item.dnsIssue.label}
                    </StatusChip>
                  ) : item.dns === 'programmed' ? (
                    <StatusChip tone="success" tooltip="DNS records programmed">
                      DNS ready
                    </StatusChip>
                  ) : item.dns === 'not-applicable' ? (
                    <StatusChip
                      tone="muted"
                      tooltip="This hostname isn't in a Datum DNS zone, so you manage its DNS yourself">
                      External DNS
                    </StatusChip>
                  ) : (
                    <StatusChip tone="warning" busy tooltip="Programming DNS records">
                      DNS
                    </StatusChip>
                  )}
                  {item.blocked ? null : item.cert === 'ready' ? (
                    <StatusChip tone="success" tooltip="Certificate issued">
                      TLS
                    </StatusChip>
                  ) : item.cert === 'renewal-failing' ? (
                    <StatusChip
                      tone="warning"
                      tooltip={item.certMessage ?? 'Certificate renewal is failing'}>
                      TLS renewal
                    </StatusChip>
                  ) : item.cert === 'not-enabled' ? (
                    <StatusChip tone="danger" tooltip={WILDCARD_NOT_ENABLED_MESSAGE}>
                      Wildcards not enabled
                    </StatusChip>
                  ) : item.certAwaitingDns ? (
                    <StatusChip
                      tone="warning"
                      tooltip="Issued once the Certificate record on the Configuration tab is in place">
                      TLS awaiting DNS
                    </StatusChip>
                  ) : item.cert === 'failed' ? (
                    <StatusChip tone="danger" tooltip={item.certMessage ?? 'Certificate failed'}>
                      TLS failed
                    </StatusChip>
                  ) : (
                    <StatusChip tone="warning" busy tooltip="Issuing certificate">
                      TLS
                    </StatusChip>
                  )}
                  {item.recordsToPublish > 0 ? (
                    <StatusChip
                      tone="warning"
                      tooltip="Records to publish at your DNS provider are listed on the Configuration tab">
                      {item.recordsToPublish === 1
                        ? '1 DNS record to add'
                        : `${item.recordsToPublish} DNS records to add`}
                    </StatusChip>
                  ) : null}
                </>
              }
            />
          ))}
        </ul>
      </CardContent>
      <ProxyZoneRecordsWatch
        projectId={projectId}
        zoneIds={matchedZones.map((zone) => zone.name)}
      />
      <ProxyHostnamesConfigDialog ref={hostnamesDialogRef} projectId={projectId} />
    </Card>
  );
}
