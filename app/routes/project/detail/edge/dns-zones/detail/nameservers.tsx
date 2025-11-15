import { BadgeCopy } from '@/components/badge/badge-copy';
import { NoteCard } from '@/components/note-card/note-card';
import { NameserverTable } from '@/features/edge/dns-zone/overview/nameservers';
import { Col, Row } from '@datum-ui/components';
import { InfoIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useRouteLoaderData } from 'react-router';

export default function DnsZoneNameserversPage() {
  const { dnsZone, domain } = useRouteLoaderData('dns-zone-detail');

  const dnsHost = useMemo(() => {
    return domain?.status?.nameservers?.[0]?.ips?.[0]?.registrantName;
  }, [domain]);

  const registrar = useMemo(() => {
    return domain?.status?.registration?.registrar?.name;
  }, [domain]);

  console.log('domain', domain);

  return (
    <Row gutter={[0, 32]}>
      <Col span={24}>
        <NameserverTable
          tableTitle={{
            title: 'Nameservers',
          }}
          data={domain?.status?.nameservers ?? []}
          registration={domain?.status?.registration ?? {}}
        />
      </Col>
      <Col span={24}>
        <NoteCard
          icon={<InfoIcon className="size-5" />}
          title="Your DNS Zone is Hosted Elsewhere"
          description={
            <div className="flex max-w-[810px] flex-col gap-5">
              <span className="text-sm">
                This DNS zone is currently hosted by {dnsHost} and the underlying domain is
                registered at {registrar}. To use Datum nameservers, you&apos;ll want to visit{' '}
                {registrar} and replace the existing nameservers to match the following:
              </span>
              {dnsZone?.status?.nameservers && (dnsZone?.status?.nameservers ?? [])?.length > 0 && (
                <div className="flex items-center gap-4">
                  {dnsZone?.status?.nameservers?.map((nameserver: string, index: number) => (
                    <BadgeCopy
                      key={`nameserver-${index}`}
                      value={nameserver ?? ''}
                      text={nameserver ?? ''}
                      badgeTheme="light"
                      badgeType="quaternary"
                      className="border-none"
                    />
                  ))}
                </div>
              )}
            </div>
          }
        />
      </Col>
    </Row>
  );
}
