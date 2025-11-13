import { BadgeCopy } from '@/components/badge/badge-copy';
import { PageTitle } from '@/components/page-title/page-title';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns-zone.interface';
import { Button, Card, CardContent, CardHeader, CardTitle, Col, Row } from '@datum-ui/components';
import { CheckIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useRouteLoaderData } from 'react-router';

export default function DnsZoneOverviewPage() {
  const dnsZone = useRouteLoaderData<IDnsZoneControlResponse>('dns-zone-detail');

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
    <Row gutter={[0, 28]}>
      <Col span={24}>
        <PageTitle title={dnsZone?.domainName ?? 'DNS Zone'} />
      </Col>
      <Col span={24}>
        <Card className="relative gap-6 overflow-hidden rounded-xl px-3 py-8 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Add Key DNS Records</CardTitle>
          </CardHeader>
          <CardContent className="max-w-4xl">
            <ul className="space-y-3.5 text-sm">
              {dnsRecordItems.map((item, index) => (
                <li key={`dns-record-item-${index}`} className="flex items-start gap-2.5">
                  <CheckIcon className="text-tertiary mt-0.5 size-3.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Button type="primary" theme="solid" size="small" className="mt-6">
              Edit DNS records
            </Button>

            <img
              src={'/images/scene-3.png'}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-0 bottom-0 h-auto w-1/3 max-w-48 rounded-bl-xl select-none"
            />
          </CardContent>
        </Card>
      </Col>
      <Col span={24}>
        <Card className="relative gap-6 overflow-hidden rounded-xl px-3 py-8 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Point Your Nameservers at Datum</CardTitle>
          </CardHeader>
          <CardContent className="max-w-4xl">
            <p className="text-sm leading-relaxed">
              This DNS zone is currently hosted by AWS Route 53, however for optimum performance we
              recommend delegating your nameservers so that it is hosted with Datum. To do this, log
              in to your current host and change the nameservers to these:
            </p>

            <div className="mt-6 flex items-center gap-4">
              {dnsZone?.status?.nameservers?.map((nameserver, index) => (
                <BadgeCopy
                  key={`nameserver-${index}`}
                  value={nameserver ?? ''}
                  text={nameserver ?? ''}
                  badgeTheme="light"
                  badgeType="quaternary"
                />
              ))}
            </div>

            <img
              src={'/images/scene-4.png'}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-0 bottom-0 h-auto w-1/3 max-w-96 rounded-bl-xl select-none"
            />
          </CardContent>
        </Card>
      </Col>
    </Row>
  );
}
