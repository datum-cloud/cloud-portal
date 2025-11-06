import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { Badge } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shadcn/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shadcn/ui/tooltip';
import { CopyIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export const HttpProxyHostnamesCard = ({
  endpoint,
  status,
  customHostnames,
}: {
  endpoint?: string;
  status: IHttpProxyControlResponse['status'];
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
      defaultHostnames.map((hostname) => {
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
            (condition) => condition.type === 'HostnamesVerified' && condition.status === 'False'
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
    <Card>
      <CardHeader>
        <CardTitle>Hostnames</CardTitle>
        {endpoint && (
          <CardDescription>
            These endpoints will forward requests to your backend:{' '}
            <Badge variant="butter">{endpoint}</Badge>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {(hostnames ?? [])?.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {hostnames?.map((val) => {
              return (
                <div
                  key={val.hostname}
                  className="border-input bg-background flex items-center justify-between gap-2 rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger
                        asChild
                        className={cn(val.valid ? 'pointer-events-none' : 'cursor-pointer')}>
                        <Badge variant={val.valid ? 'default' : 'destructive'}>
                          {val.valid ? 'HTTP/HTTPS' : 'Invalid'}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>{val.valid ? 'Valid' : val.message}</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-sm font-medium">{val.hostname}</span>
                  </div>
                  <Button
                    type="quaternary"
                    theme="outline"
                    size="small"
                    className="h-7"
                    onClick={() => copyToClipboard(val.hostname)}>
                    <CopyIcon className="size-4" />
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
