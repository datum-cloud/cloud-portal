import { TextCopy } from '@/components/text-copy/text-copy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { cn } from '@/utils/common';
import { AlertTriangle } from 'lucide-react';

export const DomainVerificationCard = ({ domain }: { domain: IDomainControlResponse }) => {
  const dnsRecord = domain.status?.verification?.dnsRecord;
  const httpToken = domain.status?.verification?.httpToken;

  if (!dnsRecord && !httpToken) {
    return null;
  }

  return (
    <Card
      className={cn(
        'border-2 border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/20'
      )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base leading-none font-medium">
          <AlertTriangle className="size-4 text-yellow-500" />
          Verification Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          To verify domain ownership, use one of the methods below. Once verified, you may remove
          the record from your DNS system.
        </p>
        {dnsRecord && (
          <div className="bg-muted rounded-md border p-3 text-sm">
            <p className="font-semibold">DNS TXT Record</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Add this record to your DNS provider:
            </p>
            <div className="mt-2 flex flex-col gap-2 font-mono text-xs">
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Type:</span>
                <span>{dnsRecord.type}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Name:</span>
                <TextCopy value={dnsRecord.name} text={dnsRecord.name} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Value:</span>
                <TextCopy value={dnsRecord.content} text={dnsRecord.content} />
              </div>
            </div>
          </div>
        )}
        {httpToken && (
          <div className="bg-muted rounded-md border p-3 text-sm">
            <p className="font-semibold">HTTP Token</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Create a file at the specified URL with the following body:
            </p>
            <div className="mt-2 flex flex-col gap-2 font-mono text-xs">
              <div className="flex flex-col gap-1">
                <span className="font-semibold">URL:</span>
                <TextCopy value={httpToken.url} text={httpToken.url} className="break-all" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Body:</span>
                <TextCopy value={httpToken.body} text={httpToken.body} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
