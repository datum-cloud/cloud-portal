import { DnsZoneDiscoveryPreview } from '@/features/edge/dns-zone/discovery-preview';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import type { MetaFunction } from 'react-router';
import { useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Discovery</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('DNS Zone Discovery');
});

export default function DnsZoneDiscoveryPage() {
  const { projectId, dnsZoneId } = useParams();

  return (
    <div className="mx-auto w-full max-w-4xl py-8">
      <DnsZoneDiscoveryPreview projectId={projectId ?? ''} dnsZoneId={dnsZoneId ?? ''} />
    </div>
  );
}
