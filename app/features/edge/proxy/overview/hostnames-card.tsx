import { ProxyHostnamesConfigDialog } from '@/features/edge/proxy/proxy-hostnames-dialog';
import type { ProxyHostnamesConfigDialogRef } from '@/features/edge/proxy/proxy-hostnames-dialog';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { ControlPlaneStatus } from '@/resources/base';
import { type HttpProxy } from '@/resources/http-proxies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Badge, Button, Card, CardContent, toast, Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { CopyIcon, GlobeIcon, PencilIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

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
  const [_, copy] = useCopyToClipboard();
  const [copiedText, setCopiedText] = useState('');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    copy(value).then(() => {
      setCopiedText(value);
      toast.success('Copied to clipboard');
      setCopied(true);
      setTimeout(() => {
        setCopiedText('');
        setCopied(false);
      }, 2000);
    });
  };

  const hostnames = useMemo(() => {
    const customHostnames = proxy?.hostnames ?? [];
    const statuses = proxy?.hostnameStatuses ?? [];

    return customHostnames.map((hostname) => {
      const hostnameStatus = statuses.find((hs) => hs.hostname === hostname);
      const availableCondition = hostnameStatus?.conditions?.find((c) => c.type === 'Available');
      const dnsCondition = hostnameStatus?.conditions?.find(
        (c) => c.type === 'DNSRecordProgrammed'
      );

      const verified = availableCondition?.status === 'True';
      const dnsProgrammed = dnsCondition?.status === 'True';
      const message =
        availableCondition?.status === 'False' ? availableCondition.message : undefined;

      return { hostname, verified, dnsProgrammed, message };
    });
  }, [proxy?.hostnames, proxy?.hostnameStatuses]);

  const isPending = useMemo(() => {
    if (!proxy?.status) return true;
    const transformedStatus = transformControlPlaneStatus(proxy.status);
    return transformedStatus.status === ControlPlaneStatus.Pending;
  }, [proxy?.status]);

  return (
    <Card className="h-full w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardContent className="flex flex-col gap-5 p-0 sm:px-6 sm:pb-4">
        <div className="flex items-center gap-2.5">
          <Icon icon={GlobeIcon} size={20} className="text-secondary stroke-2" />
          <span className="text-base font-semibold">Custom Hostnames</span>
          <Button
            type="primary"
            theme="solid"
            size="xs"
            className="ml-auto"
            onClick={() => {
              if (proxy) {
                hostnamesConfigDialogRef.current?.show(proxy);
              }
            }}
            disabled={disabled ?? isPending}>
            <Icon icon={PencilIcon} size={12} />
            Edit hostnames
          </Button>
        </div>

        {hostnames.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {hostnames.map((val) => {
              return (
                <div
                  key={val.hostname}
                  className="border-input bg-background flex items-center justify-between gap-2 rounded-md border p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {val.verified ? (
                      <Tooltip message="This hostname has been verified by Datum">
                        <Badge
                          type="success"
                          theme="solid"
                          className="pointer-events-none text-xs!">
                          Verified
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Tooltip message={val.message ?? 'Hostname verification pending'}>
                        <Badge
                          type={val.message ? 'danger' : 'warning'}
                          className="cursor-pointer text-xs!">
                          {val.message ? 'Unverified' : 'Pending'}
                        </Badge>
                      </Tooltip>
                    )}
                    {val.dnsProgrammed && (
                      <Tooltip message="DNS records have been programmed for this hostname">
                        <Badge type="primary" className="pointer-events-none text-xs!">
                          DNS Ready
                        </Badge>
                      </Tooltip>
                    )}
                    <Tooltip message={val.hostname}>
                      <span className="text-xs font-medium wrap-anywhere">{val.hostname}</span>
                    </Tooltip>
                  </div>
                  <Button
                    type="quaternary"
                    theme="outline"
                    size="small"
                    className="h-7"
                    onClick={() => copyToClipboard(val.hostname)}>
                    <Icon icon={CopyIcon} className="size-4" />
                    {copied && copiedText === val.hostname ? 'Copied' : 'Copy'}
                  </Button>
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
