import { DateTime } from '@/components/date-time';
import { TextCopy } from '@/components/text-copy/text-copy';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@datum-ui/components';
import { Separator } from '@shadcn/ui/separator';

export const DomainVerificationCard = ({ domain }: { domain: IDomainControlResponse }) => {
  const dnsRecord = domain.status?.verification?.dnsRecord;
  const httpToken = domain.status?.verification?.httpToken;

  if (!dnsRecord && !httpToken) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Verification</CardTitle>
        <CardDescription>
          To verify domain ownership, use one of the methods below. Once verified, you may remove
          the record from your DNS system.{' '}
          {domain.status?.verification?.nextVerificationAttempt && (
            <>
              Next verification{' '}
              <DateTime
                variant="absolute"
                date={domain.status.verification.nextVerificationAttempt}
                className="text-foreground w-fit font-semibold"
                showTooltip={false}
              />
            </>
          )}
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {dnsRecord && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col text-sm">
              <span className="font-semibold">DNS TXT Record</span>
              <span className="text-muted-foreground">Add this record to your DNS provider:</span>
            </div>

            <div className="bg-muted flex flex-col gap-3 rounded-md border p-3 font-mono text-sm">
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Type:</span>
                <span>{dnsRecord.type}</span>
              </div>
              {dnsRecord.name && (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">Name:</span>
                  <TextCopy value={dnsRecord.name} text={dnsRecord.name} />
                </div>
              )}
              {dnsRecord.content && (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">Value:</span>
                  <TextCopy value={dnsRecord.content} text={dnsRecord.content} />
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {httpToken && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col text-sm">
              <span className="font-semibold">HTTP Token</span>
              <span className="text-muted-foreground">
                Create a file at the specified URL with the following body:
              </span>
            </div>
            <div className="bg-muted flex flex-col gap-3 rounded-md border p-3 font-mono text-sm">
              {httpToken.url && (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">URL:</span>
                  <TextCopy value={httpToken.url} text={httpToken.url} className="break-all" />
                </div>
              )}
              {httpToken.body && (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">Body:</span>
                  <TextCopy value={httpToken.body} text={httpToken.body} />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
