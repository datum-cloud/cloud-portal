import { ProxyHostnamesConfigDialog } from '@/features/edge/proxy/proxy-hostnames-dialog';
import type { ProxyHostnamesConfigDialogRef } from '@/features/edge/proxy/proxy-hostnames-dialog';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { PermissionButton } from '@/modules/rbac';
import {
  type HttpProxy,
  getCertificateReadyCondition,
  getCertificateReadyDisplay,
} from '@/resources/http-proxies';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { CopyIcon, GlobeIcon, LockIcon, PencilIcon } from 'lucide-react';
import { useMemo, useRef } from 'react';

export const HttpProxyHostnamesCard = ({
  proxy,
  projectId,
  disabled,
}: {
  proxy?: HttpProxy;
  projectId?: string;
  disabled?: boolean;
}) => {
  const hostnamesConfigDialogRef = useRef<ProxyHostnamesConfigDialogRef>(null);
  const [_, copy, isCopied] = useCopyToClipboard();

  const hostnames = useMemo(() => {
    const customHostnames = proxy?.hostnames ?? [];
    const statuses = proxy?.hostnameStatuses ?? [];

    return customHostnames.map((hostname) => {
      const hostnameStatus = statuses.find((hs) => hs.hostname === hostname);
      const availableCondition = hostnameStatus?.conditions?.find((c) => c.type === 'Available');
      const dnsCondition = hostnameStatus?.conditions?.find(
        (c) => c.type === 'DNSRecordProgrammed'
      );
      const certCondition = getCertificateReadyCondition(hostnameStatus);
      const certStatus = getCertificateReadyDisplay(certCondition);

      const verified = availableCondition?.status === 'True';
      const dnsProgrammed = dnsCondition?.status === 'True';
      const message =
        availableCondition?.status === 'False' ? availableCondition.message : undefined;

      return { hostname, verified, dnsProgrammed, certStatus, certCondition, message };
    });
  }, [proxy?.hostnames, proxy?.hostnameStatuses]);

  return (
    <Card className="h-full w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardContent className="flex flex-col gap-5 p-0 sm:px-6 sm:pb-4">
        <div className="flex w-full items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon icon={GlobeIcon} size={20} className="text-secondary shrink-0 stroke-2" />
            <span className="truncate text-base font-semibold">Custom Hostnames</span>
          </div>
          <PermissionButton
            resource="httpproxies"
            verb="patch"
            group="networking.datumapis.com"
            namespace="default"
            scope="project"
            projectId={projectId}
            deniedReason="You don't have permission to edit this AI Edge"
            type="primary"
            theme="solid"
            size="xs"
            className="shrink-0"
            onClick={() => {
              if (proxy) {
                hostnamesConfigDialogRef.current?.show(proxy);
              }
            }}
            disabled={disabled}>
            <Icon icon={PencilIcon} size={12} />
            Edit hostnames
          </PermissionButton>
        </div>

        {proxy?.tlsHostname && (
          <div className="border-input bg-background flex items-center gap-2 rounded-md border p-2.5">
            <Icon icon={LockIcon} size={14} className="text-muted-foreground shrink-0 self-start" />
            <div className="flex min-w-0 flex-col">
              <span className="text-muted-foreground text-[11px] font-medium">TLS Hostname</span>
              <div className="flex items-center gap-2">
                <Tooltip message={proxy.tlsHostname}>
                  <span className="min-w-0 truncate text-sm font-medium">{proxy.tlsHostname}</span>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {hostnames.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {hostnames.map((val) => {
              return (
                <div
                  key={val.hostname}
                  className="border-input bg-background flex flex-col gap-1.5 rounded-md border p-2.5">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <Tooltip message={val.hostname}>
                      <span className="min-w-0 truncate text-sm font-medium">{val.hostname}</span>
                    </Tooltip>
                    <Button
                      type="quaternary"
                      theme="outline"
                      size="small"
                      className="h-7 shrink-0"
                      onClick={() => copy(`https://${val.hostname}`, { withToast: true })}>
                      <Icon icon={CopyIcon} className="size-4" />
                      {isCopied(val.hostname) ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
                    {val.verified ? (
                      <Tooltip message="This hostname has been verified by Datum">
                        <span className="font-medium text-(--color-badge-success)">
                          Hostname Verified
                        </span>
                      </Tooltip>
                    ) : val.message ? (
                      <Tooltip message={val.message}>
                        <span className="font-medium text-(--color-badge-danger)">Unverified</span>
                      </Tooltip>
                    ) : (
                      <Tooltip message="Waiting for hostname ownership verification to complete">
                        <span className="inline-flex items-center gap-1 font-medium text-(--color-badge-warning)">
                          <SpinnerIcon size="xs" aria-hidden="true" />
                          Verifying hostname
                        </span>
                      </Tooltip>
                    )}
                    <span className="text-muted-foreground/60" aria-hidden>
                      ·
                    </span>
                    {val.dnsProgrammed ? (
                      <Tooltip message="DNS records have been programmed for this hostname">
                        <span className="font-medium text-(--color-badge-success)">DNS Ready</span>
                      </Tooltip>
                    ) : (
                      <Tooltip message="Programming DNS records for this hostname">
                        <span className="inline-flex items-center gap-1 font-medium text-(--color-badge-warning)">
                          <SpinnerIcon size="xs" aria-hidden="true" />
                          Configuring DNS
                        </span>
                      </Tooltip>
                    )}
                    <span className="text-muted-foreground/60" aria-hidden>
                      ·
                    </span>
                    {val.certStatus === 'ready' ? (
                      <Tooltip message="TLS certificate is issued and ready for this hostname">
                        <span className="font-medium text-(--color-badge-success)">TLS Ready</span>
                      </Tooltip>
                    ) : val.certStatus === 'failed' ? (
                      <Tooltip
                        message={
                          val.certCondition?.message || 'TLS certificate provisioning failed'
                        }>
                        <span className="font-medium text-(--color-badge-danger)">TLS Failed</span>
                      </Tooltip>
                    ) : val.certStatus === 'challenge' ? (
                      <Tooltip
                        message={
                          val.certCondition?.message ||
                          'Completing ACME challenge with the certificate authority'
                        }>
                        <span className="inline-flex items-center gap-1 font-medium text-(--color-badge-warning)">
                          <SpinnerIcon size="xs" aria-hidden="true" />
                          Solving ACME challenge
                        </span>
                      </Tooltip>
                    ) : (
                      <Tooltip
                        message={
                          val.certCondition?.message ||
                          'Requesting a TLS certificate from the certificate authority'
                        }>
                        <span className="inline-flex items-center gap-1 font-medium text-(--color-badge-warning)">
                          <SpinnerIcon size="xs" aria-hidden="true" />
                          Issuing TLS certificate
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border-input bg-background flex min-h-[44px] items-center rounded-md border p-2">
            <span className="text-muted-foreground text-xs font-medium">
              No custom hostnames configured
            </span>
          </div>
        )}
      </CardContent>
      {proxy && projectId && (
        <ProxyHostnamesConfigDialog ref={hostnamesConfigDialogRef} projectId={projectId} />
      )}
    </Card>
  );
};
