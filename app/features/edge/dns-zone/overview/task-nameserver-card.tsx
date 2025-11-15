import { BadgeCopy } from '@/components/badge/badge-copy';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { useMemo } from 'react';

export const TaskNameserverCard = ({ dnsZone }: { dnsZone: IDnsZoneControlResponse }) => {
  const dnsHost = useMemo(() => {
    return dnsZone?.status?.domainRef?.status?.nameservers?.[0].ips?.[0]?.registrantName;
  }, [dnsZone]);

  return (
    <Card className="relative gap-6 overflow-hidden rounded-xl px-3 py-8 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Point Your Nameservers at Datum</CardTitle>
      </CardHeader>
      <CardContent className="max-w-4xl">
        <p className="text-sm leading-relaxed">
          {dnsHost ? (
            <>
              This DNS zone is currently hosted by {dnsHost}, however for optimum performance we
              recommend delegating your nameservers so that it is hosted with Datum. To do this, log
              in to your current host and change the nameservers to these:
            </>
          ) : (
            <>
              This DNS zone is currently not associated with any detected host. For optimum
              performance we recommend delegating your nameservers to Datum. To do this, log in to
              your domain&apos;s current DNS provider and change the nameservers to these:
            </>
          )}
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
  );
};
