import { DateTime } from '@/components/date-time';
import type { Domain } from '@/resources/domains';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { useCopyToClipboard } from '@datum-cloud/datum-ui/hooks';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { BookOpenIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';

/** Verification badge — text truncates, copy button always visible, click anywhere to copy */
function VerificationBadge({ value }: { value: string }) {
  const [_, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (!value) return;

    copy(value).then((success) => {
      if (!success) return;
      toast.success('Copied to clipboard');
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <Tooltip message={copied ? 'Copied!' : 'Copy'}>
      <div
        role="button"
        tabIndex={0}
        onClick={copyToClipboard}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            copyToClipboard();
          }
        }}
        className="flex max-w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-md border border-transparent bg-[var(--color-badge-muted)] px-1.5 py-[5px] text-[var(--color-badge-muted-foreground)] transition-colors dark:border-[var(--color-badge-muted)]/20 dark:bg-[var(--color-badge-muted)]/20">
        <Text size="xs" ellipsis className="min-w-0 flex-1 font-mono">
          {value}
        </Text>
        <span className="text-muted-foreground flex shrink-0 items-center justify-center transition-colors">
          <Icon icon={CopyIcon} className="size-3" />
        </span>
      </div>
    </Tooltip>
  );
}

export const DomainVerificationCard = ({ domain }: { domain: Domain }) => {
  const dnsRecord = domain.status?.verification?.dnsRecord;
  const httpToken = domain.status?.verification?.httpToken;

  if (!dnsRecord && !httpToken) {
    return null;
  }

  return (
    <Card size="sm" className="w-full overflow-hidden">
      <CardHeader size="sm">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={BookOpenIcon} size={16} className="text-secondary" />
          Manual Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Text as="p" weight="normal">
          To verify domain ownership, use one of the methods below. Once verified, you may remove
          the record from your DNS system. Next verification{' '}
          {domain.status?.verification?.nextVerificationAttempt && (
            <DateTime
              variant="absolute"
              date={domain.status.verification.nextVerificationAttempt}
              className="text-foreground w-fit font-semibold"
              showTooltip={false}
              format="EEEE d MMMM yyyy HH:mm zzz"
            />
          )}
        </Text>
        <div className="divide-border flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="dark:border-quaternary flex w-full min-w-0 flex-col gap-5 border-b pb-5 sm:w-1/2 sm:border-r sm:border-b-0 sm:pr-7 sm:pb-0">
            <Text as="p" weight="medium">
              Add a TXT DNS Record
            </Text>
            <div className="flex min-w-0 flex-col gap-3.5">
              {dnsRecord?.name && (
                <div className="flex min-w-0 flex-col gap-2">
                  <Text size="xs" weight="normal">
                    Name
                  </Text>
                  <VerificationBadge value={dnsRecord.name} />
                </div>
              )}
              {dnsRecord?.content && (
                <div className="flex min-w-0 flex-col gap-2">
                  <Text size="xs" weight="normal">
                    Value
                  </Text>
                  <VerificationBadge value={dnsRecord.content} />
                </div>
              )}
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-5 sm:w-1/2 sm:pl-7">
            <Text as="p" weight="medium">
              Create a HTTP Token File
            </Text>
            <div className="flex min-w-0 flex-col gap-3.5">
              {httpToken?.url && (
                <div className="flex min-w-0 flex-col gap-2">
                  <Text size="xs" weight="normal">
                    URL
                  </Text>
                  <VerificationBadge value={httpToken.url} />
                </div>
              )}
              {httpToken?.body && (
                <div className="flex min-w-0 flex-col gap-2">
                  <Text size="xs" weight="normal">
                    Body
                  </Text>
                  <VerificationBadge value={httpToken.body} />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
