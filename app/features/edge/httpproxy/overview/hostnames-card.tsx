import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const HttpProxyHostnamesCard = ({
  endpoint,
  hostnames,
}: {
  endpoint?: string;
  hostnames: string[];
}) => {
  const [copiedText, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    copy(value).then(() => {
      toast.success('Copied to clipboard');
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Proxy Endpoints</CardTitle>
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
            {hostnames?.map((hostname) => {
              const value = `https://${hostname}`;
              return (
                <div
                  key={hostname}
                  className="border-input bg-background flex items-center justify-between gap-2 rounded-md border p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">HTTPS</Badge>
                    <span className="text-sm font-medium">{hostname}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => copyToClipboard(value)}>
                    <CopyIcon className="size-4" />
                    {copied && copiedText?.includes(value) ? 'Copied' : 'Copy'}
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
