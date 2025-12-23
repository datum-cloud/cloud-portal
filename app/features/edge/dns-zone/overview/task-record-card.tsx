import { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Card, CardContent, CardHeader, CardTitle, LinkButton } from '@datum-ui/components';
import { IconWrapper } from '@datum-ui/components/icons/icon-wrapper';
import { CheckIcon } from 'lucide-react';
import { useMemo } from 'react';

export const TaskRecordCard = ({
  projectId,
  dnsZone,
}: {
  projectId: string;
  dnsZone: IDnsZoneControlResponse;
}) => {
  const dnsRecordItems = useMemo(
    () => [
      <>
        Add an A, AAAA, or CNAME record for <strong>www</strong> so that{' '}
        <strong>www.{dnsZone?.domainName}</strong> will resolve.
      </>,
      <>
        Add an A, AAAA, or CNAME record for your <strong>root</strong> so that{' '}
        <strong>{dnsZone?.domainName}</strong> will resolve.
      </>,
      <>
        Add an MX record for your <strong>root domain</strong> so that mail can reach{' '}
        <strong>@{dnsZone?.domainName}</strong> addresses.
      </>,
    ],
    [dnsZone?.domainName]
  );
  return (
    <Card className="relative gap-6 overflow-hidden rounded-xl px-3 py-8 shadow">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Add Key DNS Records</CardTitle>
      </CardHeader>
      <CardContent className="max-w-4xl">
        <ul className="space-y-3.5 text-sm">
          {dnsRecordItems.map((item, index) => (
            <li key={`dns-record-item-${index}`} className="flex items-start gap-2.5">
              <IconWrapper icon={CheckIcon} className="text-tertiary mt-0.5 size-3.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <LinkButton
          type="primary"
          theme="solid"
          size="small"
          className="mt-6"
          to={getPathWithParams(paths.project.detail.dnsZones.detail.dnsRecords, {
            projectId: projectId ?? '',
            dnsZoneId: dnsZone?.name ?? '',
          })}>
          Edit DNS records
        </LinkButton>

        <img
          src={'/images/scene-3.png'}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 h-auto w-1/3 max-w-48 rounded-bl-xl select-none"
        />
      </CardContent>
    </Card>
  );
};
