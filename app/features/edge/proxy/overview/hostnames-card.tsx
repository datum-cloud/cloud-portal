import { ProxyHostnamesConfigDialog } from '@/features/edge/proxy/proxy-hostnames-dialog';
import type { ProxyHostnamesConfigDialogRef } from '@/features/edge/proxy/proxy-hostnames-dialog';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { ControlPlaneStatus } from '@/resources/base';
import { type HttpProxy } from '@/resources/http-proxies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Badge, Button, Card, CardContent, toast, Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { Skeleton } from '@shadcn/ui/skeleton';
import { CopyIcon, GlobeIcon, PencilIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

export const HttpProxyHostnamesCard = ({
  status,
  customHostnames,
  proxy,
  projectId,
  disabled,
}: {
  status: HttpProxy['status'];
  customHostnames?: string[];
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

  const verifiedHostnames = status?.hostnames ?? [];

  const hostnames: { hostname: string; valid: boolean; verified: boolean; message?: string }[] =
    useMemo(() => {
      const defaultHostnames = verifiedHostnames;

      const system =
        defaultHostnames.map((hostname: string) => {
          return {
            hostname,
            valid: true,
            verified: true, // System hostnames are always verified
          };
        }) ?? [];

      const custom =
        (customHostnames ?? [])
          ?.filter((hostname) => !defaultHostnames.includes(hostname))
          ?.map((hostname) => {
            const hostNameCondition = status?.conditions?.find(
              (condition: { type: string; status: string; message: string }) =>
                condition.type === 'HostnamesVerified' && condition.status === 'False'
            );
            const valid = !hostNameCondition?.message.includes('hostname');
            // Custom hostnames are verified if they appear in status.hostnames
            const verified = defaultHostnames.includes(hostname);
            return {
              hostname,
              valid,
              verified,
              message: valid ? undefined : hostNameCondition?.message,
            };
          }) ?? [];
      return [...system, ...custom];
    }, [status, customHostnames, verifiedHostnames]);

  // Check if proxy is still being created (Pending status)
  const isPending = useMemo(() => {
    if (!status) return true;
    const transformedStatus = transformControlPlaneStatus(status);
    return transformedStatus.status === ControlPlaneStatus.Pending;
  }, [status]);

  // Show skeleton when pending and no hostnames
  const showSkeleton = isPending;

  return (
    <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardContent className="flex flex-col gap-5 p-0 sm:px-6 sm:pb-4">
        <div className="flex items-center gap-2.5">
          <Icon icon={GlobeIcon} size={20} className="text-secondary stroke-2" />
          <span className="text-base font-semibold">Hostnames</span>
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

        {showSkeleton ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 1 }).map((_, index) => (
              <div
                key={index}
                className="border-input dark:bg-background flex items-center justify-between gap-2 rounded-md border bg-white p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-5 w-80" />
                </div>
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            ))}
          </div>
        ) : (
          (hostnames ?? [])?.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {hostnames?.map((val) => {
                return (
                  <div
                    key={val.hostname}
                    className="border-input bg-background flex items-center justify-between gap-2 rounded-md border p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tooltip message={val.valid ? 'Valid' : val.message}>
                        <Badge
                          type={val.valid ? 'primary' : 'danger'}
                          className={cn(
                            'text-xs!',
                            val.valid ? 'pointer-events-none' : 'cursor-pointer'
                          )}>
                          {val.valid ? 'HTTP/HTTPS' : 'Invalid'}
                        </Badge>
                      </Tooltip>
                      {val.verified && (
                        <Badge type="success" theme="solid" className="text-xs!">
                          Verified
                        </Badge>
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
          )
        )}
      </CardContent>
      {proxy && projectId && (
        <ProxyHostnamesConfigDialog ref={hostnamesConfigDialogRef} projectId={projectId} />
      )}
    </Card>
  );
};
