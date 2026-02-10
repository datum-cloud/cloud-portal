import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { type HttpProxy } from '@/resources/http-proxies';
import { Badge, Button, Card, CardContent, toast, Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { CopyIcon, GlobeIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

export const HttpProxyHostnamesCard = ({
  endpoint,
  status,
  customHostnames,
}: {
  endpoint?: string;
  status: HttpProxy['status'];
  customHostnames?: string[];
}) => {
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

  const hostnames: { hostname: string; valid: boolean; message?: string }[] = useMemo(() => {
    const defaultHostnames = status?.hostnames ?? [];

    const system =
      defaultHostnames.map((hostname: string) => {
        return {
          hostname,
          valid: true,
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
          return {
            hostname,
            valid,
            message: valid ? undefined : hostNameCondition?.message,
          };
        }) ?? [];
    return [...system, ...custom];
  }, [status, customHostnames]);

  return (
    <Card className="w-full p-0 shadow-md">
      <CardContent className="flex flex-col gap-5 px-9 py-8">
        <div className="flex items-center gap-2.5">
          <Icon icon={GlobeIcon} size={20} className="text-secondary stroke-2" />
          <span className="text-base font-semibold">Hostnames</span>
        </div>
        {endpoint && (
          <div className="text-sm font-normal">
            These endpoints will forward requests to your backend:{' '}
            <Badge type="quaternary" theme="outline">
              {endpoint}
            </Badge>
          </div>
        )}
        {(hostnames ?? [])?.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {hostnames?.map((val) => {
              return (
                <div
                  key={val.hostname}
                  className="border-input bg-background flex items-center justify-between gap-2 rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <Tooltip message={val.valid ? 'Valid' : val.message}>
                      <Badge
                        type={val.valid ? 'primary' : 'danger'}
                        className={cn(
                          '!text-xs',
                          val.valid ? 'pointer-events-none' : 'cursor-pointer'
                        )}>
                        {val.valid ? 'HTTP/HTTPS' : 'Invalid'}
                      </Badge>
                    </Tooltip>
                    <span className="text-xs font-medium break-all">{val.hostname}</span>
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
        )}
      </CardContent>
    </Card>
  );
};
