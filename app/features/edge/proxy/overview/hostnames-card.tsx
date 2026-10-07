import { StatusChip } from '@/components/card/status-chip';
import { ValueRow } from '@/components/card/value-row';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import {
  ProxyZoneRecordsWatch,
  useProxyZoneRecords,
} from '@/features/edge/proxy/hooks/use-proxy-zone-records';
import {
  HostnameDnsRecords,
  type HostnameDnsZone,
} from '@/features/edge/proxy/overview/hostname-dns-records';
import { HostnameStatusChips } from '@/features/edge/proxy/overview/hostname-status-chips';
import { ProxyHostnamesConfigDialog } from '@/features/edge/proxy/proxy-hostnames-dialog';
import type { ProxyHostnamesConfigDialogRef } from '@/features/edge/proxy/proxy-hostnames-dialog';
import { findCoveringDomain } from '@/features/edge/proxy/utils/covering-domain';
import { findZoneForHostname } from '@/features/edge/proxy/utils/delete-dns-preview';
import { buildHostnameState, type HostnameState } from '@/features/edge/proxy/utils/hostname-state';
import { requestWildcardHostnames } from '@/features/edge/proxy/utils/request-wildcards';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { showMutationErrorToast } from '@/modules/quota';
import { PermissionButton, usePermission } from '@/modules/rbac';
import { ControlPlaneStatus } from '@/resources/base';
import { useDomains } from '@/resources/domains';
import {
  type HttpProxy,
  HTTP_PROXY_PROVISIONING_POLL_MS,
  WILDCARD_NOT_ENABLED_MESSAGE,
  getDnsRecordProgrammedCondition,
  getDnsRecordProgrammedDisplay,
  isHeldBackByCustomHostnames,
  isHostnameDnsInFlight,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { MoreActions, type ActionItem } from '@datum-cloud/datum-ui/more-actions';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import {
  CopyIcon,
  GlobeIcon,
  LifeBuoyIcon,
  ListIcon,
  LockIcon,
  PlusIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router';

const EDIT_DENIED = "You don't have permission to edit this Application Load Balancer";

type HostnameRow = HostnameState & {
  /** Records page of the Datum DNS zone that serves this hostname, when we manage it. */
  dnsRecordsHref?: string;
  /** That zone with its records, once they've loaded, so required records can be written into it. */
  dnsZone?: HostnameDnsZone;
  /** The Domain whose verification decides ownership, for linking to it. */
  domain?: {
    domainName: string;
    href: string;
    /** Verified through a Datum DNS zone and not by TXT record, which wildcards don't accept yet. */
    verifiedByZoneOnly: boolean;
  };
};

type DomainCondition = { type?: string; status?: string };

function isVerifiedByZoneOnly(status: unknown): boolean {
  const conditions = ((status as { conditions?: DomainCondition[] } | undefined)?.conditions ??
    []) as DomainCondition[];
  const isTrue = (type: string) => conditions.some((c) => c.type === type && c.status === 'True');
  return isTrue('VerifiedDNSZone') && !isTrue('VerifiedDNS');
}

/**
 * Plain-language version of the operator's "needs DNS proof" refusal, pointed
 * at what the user can actually do from here. The full operator message stays
 * in the chip's tooltip.
 */
function dnsProofGuidance(row: HostnameRow): { message: string; linkDomain: boolean } {
  if (row.userRecords.some((r) => r.purpose === 'Ownership' && r.state === 'Missing')) {
    return {
      message:
        'Wildcards need their domain proven by a DNS TXT record. Add the Ownership record below.',
      linkDomain: false,
    };
  }
  if (row.domain?.verifiedByZoneOnly) {
    const name = row.domain.domainName;
    return {
      message: `Wildcards directly on ${name} aren't supported yet: it was verified through Datum DNS, which doesn't count as proof for wildcards. Use a wildcard one level down instead: add a Domain for app.${name} and use *.app.${name}.`,
      linkDomain: false,
    };
  }
  return {
    message: `Wildcards need ${row.domain?.domainName ?? 'their domain'} verified by a DNS TXT record. HTTP verification doesn't count.`,
    linkDomain: true,
  };
}

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
  // they just lose the "View DNS records" link. Records themselves are how we
  // detect a manual/ALB clash — the proxy condition often stays "pending".
  const pollZoneRecords = useRef(true);
  const dnsInFlight = useMemo(
    () =>
      customHostnames.some((hostname) =>
        isHostnameDnsInFlight(
          getDnsRecordProgrammedCondition(
            proxy?.hostnameStatuses?.find((entry) => entry.hostname === hostname)
          )
        )
      ),
    [customHostnames, proxy?.hostnameStatuses]
  );

  const { zones, matchedZones, zoneRecords } = useProxyZoneRecords(projectId, customHostnames, {
    refetchInterval: () =>
      dnsInFlight && pollZoneRecords.current ? HTTP_PROXY_PROVISIONING_POLL_MS : false,
  });

  const { data: domains = [] } = useDomains(projectId ?? '', {
    enabled: !!projectId && customHostnames.length > 0,
  });

  const updateProxy = useUpdateHttpProxy(projectId ?? '', proxy?.name ?? '');

  const rows = useMemo<HostnameRow[]>(() => {
    const statuses = proxy?.hostnameStatuses ?? [];
    return customHostnames.map((hostname) => {
      const hostnameStatus = statuses.find((hs) => hs.hostname === hostname);
      const zone = projectId ? findZoneForHostname(zones, hostname) : undefined;
      const dns = getDnsRecordProgrammedDisplay(getDnsRecordProgrammedCondition(hostnameStatus));
      const inDatumZone = !!zone && dns !== 'not-applicable';
      const coveringDomain = projectId ? findCoveringDomain(domains, hostname) : undefined;
      // Undefined until the zone's records load (or if they fail), so nothing is
      // offered against a zone we haven't seen.
      const zoneRecordList = zone
        ? zoneRecords.find((entry) => entry.zoneDomain === zone.domainName)?.records
        : undefined;

      return {
        ...buildHostnameState({
          hostname,
          hostnameStatus,
          inDatumZone,
          proxyName: proxy?.name,
          zoneRecords,
        }),
        dnsRecordsHref:
          zone && projectId
            ? getPathWithParams(paths.project.detail.dnsZones.detail.dnsRecords, {
                projectId,
                dnsZoneId: zone.name,
              })
            : undefined,
        domain:
          coveringDomain && projectId
            ? {
                domainName: coveringDomain.domainName,
                verifiedByZoneOnly: isVerifiedByZoneOnly(coveringDomain.status),
                href: getPathWithParams(paths.project.detail.domains.detail.overview, {
                  projectId,
                  domainId: coveringDomain.name,
                }),
              }
            : undefined,
        dnsZone:
          inDatumZone && zone && projectId && zoneRecordList
            ? {
                projectId,
                zoneId: zone.name,
                zoneDomain: zone.domainName,
                records: zoneRecordList,
              }
            : undefined,
      };
    });
  }, [
    customHostnames,
    proxy?.hostnameStatuses,
    proxy?.name,
    zones,
    zoneRecords,
    projectId,
    domains,
  ]);

  pollZoneRecords.current = rows.some(
    (row) => row.dns === 'pending' && !row.dnsIssue && !row.blocked
  );

  const systemHostname = proxy?.canonicalHostname ?? proxy?.status?.hostnames?.[0];
  const proxyStatus = useMemo(
    () => (proxy?.status ? transformControlPlaneStatus(proxy.status) : undefined),
    [proxy?.status]
  );
  // A held-back custom hostname keeps the ALB "not programmed" as a whole, but
  // the default listener is serving; don't make it look like it's still coming up.
  const defaultServing =
    proxyStatus?.status === ControlPlaneStatus.Success ||
    (proxyStatus?.status === ControlPlaneStatus.Pending &&
      !!proxy &&
      isHeldBackByCustomHostnames(proxy));

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
            <Text
              as="div"
              textColor="muted"
              className="border-card-border mx-(--card-px) border-b py-3.5">
              No custom hostnames yet. Requests are served on the default hostname until you attach
              your own domain.
            </Text>
          ) : null}

          {rows.map((row) => (
            <ValueRow
              key={row.hostname}
              value={row.hostname}
              copied={isCopied(row.hostname)}
              onCopy={() => void copy(row.hostname, { withToast: true })}
              status={
                <>
                  <HostnameStatusChips state={row} projectId={projectId} />

                  {!row.blocked && (row.dnsIssue || row.dns === 'pending') && row.dnsRecordsHref ? (
                    // Conflicts are resolved by deleting the manual record on the zone page.
                    <LinkButton
                      as={Link}
                      href={row.dnsRecordsHref}
                      type="secondary"
                      theme="outline"
                      size="xs"
                      className="text-3xs h-6 px-2"
                      icon={<Icon icon={ListIcon} size={12} aria-hidden="true" />}>
                      View DNS records
                    </LinkButton>
                  ) : null}
                </>
              }
              details={<HostnameRowDetails row={row} projectId={projectId} />}
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
                  {defaultServing ? (
                    <StatusChip
                      tone="success"
                      tooltip={
                        proxyStatus?.status === ControlPlaneStatus.Success
                          ? 'Serving traffic on the default hostname'
                          : "Serving traffic on the default hostname. A custom hostname above needs attention, but that doesn't affect this one."
                      }>
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
      {projectId ? (
        <ProxyZoneRecordsWatch
          projectId={projectId}
          zoneIds={matchedZones.map((zone) => zone.name)}
        />
      ) : null}
      {proxy && projectId && (
        <ProxyHostnamesConfigDialog ref={hostnamesConfigDialogRef} projectId={projectId} />
      )}
    </Card>
  );
};

/**
 * What the user has to do for one hostname, in words: why a wildcard is held
 * back, then the records to publish at their DNS provider. Chip tooltips
 * aren't reachable on touch, so anything actionable is spelled out here.
 */
function HostnameRowDetails({ row, projectId }: { row: HostnameRow; projectId?: string }) {
  const dnsProof = row.ownership.state === 'dns-proof-required' ? dnsProofGuidance(row) : undefined;
  const blocker = dnsProof
    ? dnsProof.message
    : row.blocked
      ? row.ownership.message || row.ownership.label
      : row.cert === 'not-enabled'
        ? WILDCARD_NOT_ENABLED_MESSAGE
        : undefined;
  const showRecords = row.userRecords.some((record) => record.state === 'Missing');

  if (!blocker && !showRecords) return null;

  return (
    <div className="flex flex-col gap-2">
      {blocker ? (
        <div className="flex flex-col items-start gap-2">
          <Text as="p" size="xs" className="text-destructive flex items-start gap-1.5">
            <Icon
              icon={TriangleAlertIcon}
              size={12}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>{blocker}</span>
          </Text>
          {dnsProof && !dnsProof.linkDomain ? null : row.ownership.state ===
            'dns-proof-required' ? (
            row.domain ? (
              <LinkButton
                as={Link}
                href={row.domain.href}
                type="secondary"
                theme="outline"
                size="xs"
                className="text-3xs h-6 px-2"
                icon={<Icon icon={GlobeIcon} size={12} aria-hidden="true" />}>
                Open domain {row.domain.domainName}
              </LinkButton>
            ) : projectId ? (
              <LinkButton
                as={Link}
                href={getPathWithParams(paths.project.detail.domains.root, { projectId })}
                type="secondary"
                theme="outline"
                size="xs"
                className="text-3xs h-6 px-2"
                icon={<Icon icon={GlobeIcon} size={12} aria-hidden="true" />}>
                Go to Domains
              </LinkButton>
            ) : null
          ) : row.cert === 'not-enabled' && row.ownership.state !== 'in-use' ? (
            <Button
              type="secondary"
              theme="outline"
              size="xs"
              className="text-3xs h-6 px-2"
              icon={<Icon icon={LifeBuoyIcon} size={12} aria-hidden="true" />}
              onClick={() => requestWildcardHostnames(projectId, [row.hostname])}>
              Request wildcards
            </Button>
          ) : null}
        </div>
      ) : null}
      {showRecords ? (
        <HostnameDnsRecords
          records={row.userRecords}
          zoneRecordsHref={row.dnsRecordsHref}
          zone={row.dnsZone}
          certificateIssued={row.certificateIssued}
        />
      ) : null}
    </div>
  );
}
