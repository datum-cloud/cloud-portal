import { summarizeBackends } from './backend-summary';
import { OverviewEmptyState } from './overview-empty-state';
import {
  ProxyHostnamesConfigDialog,
  type ProxyHostnamesConfigDialogRef,
} from '@/features/edge/proxy/proxy-hostnames-dialog';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { usePermission } from '@/modules/rbac';
import {
  type HttpProxy,
  getCertificateReadyCondition,
  getCertificateReadyDisplay,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  GlobeIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  ServerIcon,
} from 'lucide-react';
import { useMemo, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';

interface HttpProxyEndpointsCardProps {
  proxy: HttpProxy;
  projectId: string;
  proxyId: string;
}

type Tone = 'success' | 'warning' | 'danger' | 'muted';

const ADD_HOSTNAME_DENIED = "You don't have permission to edit this Application Load Balancer";

function AddCustomHostnameLink({ projectId, onClick }: { projectId: string; onClick: () => void }) {
  const { hasPermission, isLoading } = usePermission('httpproxies', 'patch', {
    group: 'networking.datumapis.com',
    namespace: 'default',
    scope: 'project',
    projectId,
  });
  const denied = !isLoading && !hasPermission;
  const link = (
    <button
      type="button"
      disabled={denied}
      onClick={onClick}
      className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline disabled:opacity-50"
      data-e2e="alb-endpoints-add-hostname">
      <Icon icon={PlusIcon} size={12} aria-hidden="true" />
      Add a custom hostname
    </button>
  );
  return denied ? <Tooltip message={ADD_HOSTNAME_DENIED}>{link}</Tooltip> : link;
}

function StatusChip({
  tone,
  children,
  tooltip,
  busy,
}: {
  tone: Tone;
  children: ReactNode;
  tooltip?: string;
  busy?: boolean;
}) {
  const chip = (
    <Badge
      type={tone}
      // Muted/light is near-invisible in light mode; solid muted stays legible.
      theme={tone === 'muted' ? 'solid' : 'light'}
      className="h-5 gap-1 rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap">
      {busy ? <SpinnerIcon size="xs" aria-hidden="true" /> : null}
      {children}
    </Badge>
  );
  return tooltip ? <Tooltip message={tooltip}>{chip}</Tooltip> : chip;
}

function EndpointRow({
  eyebrow,
  value,
  chips,
  onCopy,
  copied,
}: {
  eyebrow: string;
  value: string;
  chips: ReactNode;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <li className="group/row flex flex-col gap-1.5 px-(--card-px) py-3">
      <span className="text-muted-foreground text-2xs font-medium tracking-wide uppercase">
        {eyebrow}
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <Tooltip message={value}>
          <span className="min-w-0 flex-1 truncate font-mono text-sm">{value}</span>
        </Tooltip>
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
 * Read-only endpoint summary: custom hostnames with their programming state,
 * the system-managed hostname, and a link through to the backend pool. Editing
 * lives on the Configuration tab.
 */
export function HttpProxyEndpointsCard({ proxy, projectId, proxyId }: HttpProxyEndpointsCardProps) {
  const [, copy, isCopied] = useCopyToClipboard();
  const hostnamesDialogRef = useRef<ProxyHostnamesConfigDialogRef>(null);

  const configurationHref = getPathWithParams(paths.project.detail.proxy.detail.configuration, {
    projectId,
    proxyId,
  });

  const hostnames = useMemo(() => {
    const statuses = proxy.hostnameStatuses ?? [];
    return (proxy.hostnames ?? []).map((hostname) => {
      const hostnameStatus = statuses.find((hs) => hs.hostname === hostname);
      const available = hostnameStatus?.conditions?.find((c) => c.type === 'Available');
      const dns = hostnameStatus?.conditions?.find((c) => c.type === 'DNSRecordProgrammed');
      const certCondition = getCertificateReadyCondition(hostnameStatus);
      return {
        hostname,
        verified: available?.status === 'True',
        failedMessage: available?.status === 'False' ? available.message : undefined,
        dnsProgrammed: dns?.status === 'True',
        cert: getCertificateReadyDisplay(certCondition),
        certMessage: certCondition?.message,
      };
    });
  }, [proxy.hostnames, proxy.hostnameStatuses]);

  const systemHostname = proxy.canonicalHostname ?? proxy.status?.hostnames?.[0];
  const backends = summarizeBackends(proxy);

  return (
    <Card
      size="sm"
      sectioned
      className="flex h-full flex-col overflow-hidden"
      data-e2e="alb-endpoints">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={GlobeIcon} size={16} className="text-secondary" />
          Endpoints
        </CardTitle>
        <CardAction>
          <Link
            to={`${configurationHref}#hostnames`}
            className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
            data-e2e="alb-endpoints-manage">
            <Icon icon={PencilIcon} size={12} aria-hidden="true" />
            Manage
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent padding="none" className="flex min-h-0 flex-1 flex-col">
        {/* Custom hostnames scroll; the system hostname and backend pool stay pinned below. */}
        <ul className="divide-border min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
          {hostnames.length === 0 ? (
            <li className="h-full">
              {systemHostname ? (
                <OverviewEmptyState
                  icon={GlobeIcon}
                  title="No custom hostnames"
                  description="Requests are served on the default hostname until you attach your own domain."
                  className="py-6">
                  <AddCustomHostnameLink
                    projectId={projectId}
                    onClick={() => hostnamesDialogRef.current?.show(proxy)}
                  />
                </OverviewEmptyState>
              ) : (
                <p className="text-muted-foreground px-(--card-px) py-6 text-center text-sm">
                  Hostnames appear here once the load balancer is programmed.
                </p>
              )}
            </li>
          ) : null}
          {hostnames.map((item) => (
            <EndpointRow
              key={item.hostname}
              eyebrow="Custom hostname"
              value={item.hostname}
              copied={isCopied(item.hostname)}
              onCopy={() => copy(item.hostname, { withToast: true })}
              chips={
                <>
                  {item.verified ? (
                    <StatusChip tone="success" tooltip="Hostname ownership verified">
                      Verified
                    </StatusChip>
                  ) : item.failedMessage ? (
                    <StatusChip tone="danger" tooltip={item.failedMessage}>
                      Unverified
                    </StatusChip>
                  ) : (
                    <StatusChip tone="warning" busy tooltip="Waiting for ownership verification">
                      Verifying
                    </StatusChip>
                  )}
                  {item.dnsProgrammed ? (
                    <StatusChip tone="success" tooltip="DNS records programmed">
                      DNS ready
                    </StatusChip>
                  ) : (
                    <StatusChip tone="warning" busy tooltip="Programming DNS records">
                      DNS
                    </StatusChip>
                  )}
                  {item.cert === 'ready' ? (
                    <StatusChip tone="success" tooltip="Certificate issued">
                      TLS
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
                </>
              }
            />
          ))}
        </ul>

        <ul className="divide-border border-border shrink-0 divide-y border-t">
          {systemHostname ? (
            <EndpointRow
              eyebrow="Default hostname"
              value={systemHostname}
              copied={isCopied(systemHostname)}
              onCopy={() => copy(systemHostname, { withToast: true })}
              chips={
                <StatusChip tone="muted" tooltip="Issued and managed by Datum">
                  <Icon icon={LockIcon} size={10} aria-hidden="true" />
                  System managed
                </StatusChip>
              }
            />
          ) : null}

          <li>
            <Link
              to={`${configurationHref}#backends`}
              className="hover:bg-muted/40 flex items-center gap-3 px-(--card-px) py-3 transition-colors">
              <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
                <Icon icon={ServerIcon} size={14} className="text-muted-foreground" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">Backend pool</span>
                <span className="text-muted-foreground truncate text-xs">{backends.label}</span>
              </span>
              <Icon icon={ChevronRightIcon} size={16} className="text-muted-foreground shrink-0" />
            </Link>
          </li>
        </ul>
      </CardContent>
      <ProxyHostnamesConfigDialog ref={hostnamesDialogRef} projectId={projectId} />
    </Card>
  );
}
