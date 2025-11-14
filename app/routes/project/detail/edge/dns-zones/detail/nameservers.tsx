import { NameserverTable } from '@/features/edge/dns-zone/overview/nameservers';
import { useRouteLoaderData } from 'react-router';

export default function DnsZoneNameserversPage() {
  const { domain } = useRouteLoaderData('dns-zone-detail');
  return (
    <NameserverTable
      tableTitle={{
        title: 'Nameservers',
      }}
      data={domain?.status?.nameservers ?? []}
      registration={domain?.status?.registration ?? {}}
    />
  );
}
