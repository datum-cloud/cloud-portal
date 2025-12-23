import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { Card, CardContent } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { BookOpenIcon } from 'lucide-react';

export const DomainVerificationCard = ({ domain }: { domain: IDomainControlResponse }) => {
  const dnsRecord = domain.status?.verification?.dnsRecord;
  const httpToken = domain.status?.verification?.httpToken;

  if (!dnsRecord && !httpToken) {
    return null;
  }

  return (
    <Card className="w-full p-0 shadow-md">
      <CardContent className="flex flex-col gap-5 px-9 py-8">
        <div className="flex items-center gap-2.5">
          <Icon icon={BookOpenIcon} size={20} className="text-secondary stroke-2" />
          <span className="text-base font-semibold">Manual Verification</span>
        </div>
        <p className="text-[14px] font-normal">
          To verify domain ownership, use one of the methods below. Once verified, you may remove
          the record from your DNS system. Next verification{' '}
          {domain.status?.verification?.nextVerificationAttempt && (
            <DateTime
              variant="absolute"
              date={domain.status.verification.nextVerificationAttempt}
              className="text-foreground w-fit font-semibold"
              showTooltip={false}
            />
          )}
        </p>
        <div className="divide-border flex items-start justify-between">
          <div className="dark:border-quaternary flex w-1/2 flex-col gap-5 border-r pr-7">
            <p className="text-sm font-medium">Add a TXT DNS Record</p>
            <div className="flex flex-col gap-3.5">
              {dnsRecord?.name && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-normal">Name</span>
                  <BadgeCopy
                    value={dnsRecord?.name ?? ''}
                    badgeType="muted"
                    badgeTheme="solid"
                    className="font-mono text-nowrap"
                    textClassName="text-ellipsis max-w-[240px] overflow-hidden"
                    containerClassName="w-full"
                  />
                </div>
              )}
              {dnsRecord?.content && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-normal">Value</span>
                  <BadgeCopy
                    value={dnsRecord?.content ?? ''}
                    badgeType="muted"
                    badgeTheme="solid"
                    className="font-mono text-nowrap"
                    textClassName="text-ellipsis max-w-[240px] overflow-hidden"
                    containerClassName="w-full"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex w-1/2 flex-col gap-5 pl-7">
            <p className="text-sm font-medium">Create a HTTP Token File</p>
            <div className="flex flex-col gap-3.5">
              {httpToken?.url && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-normal">URL</span>
                  <BadgeCopy
                    value={httpToken?.url ?? ''}
                    badgeType="muted"
                    badgeTheme="solid"
                    className="font-mono text-nowrap"
                    textClassName="text-ellipsis max-w-[240px] overflow-hidden"
                    containerClassName="w-full"
                  />
                </div>
              )}
              {httpToken?.body && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-normal">Body</span>
                  <BadgeCopy
                    value={httpToken?.body ?? ''}
                    badgeType="muted"
                    badgeTheme="solid"
                    className="font-mono text-nowrap"
                    textClassName="text-ellipsis max-w-[240px] overflow-hidden"
                    containerClassName="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
