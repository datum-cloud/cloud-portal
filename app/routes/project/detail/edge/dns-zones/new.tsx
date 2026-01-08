import { DnsZoneDiscoveryPreview } from '@/features/edge/dns-zone/discovery-preview';
import { DnsZoneForm } from '@/features/edge/dns-zone/form';
import { useCreateDnsZoneDiscovery } from '@/resources/dns-zone-discoveries';
import type { DnsZoneDiscovery } from '@/resources/dns-zone-discoveries';
import { useCreateDnsZone, type CreateDnsZoneInput, type DnsZone } from '@/resources/dns-zones';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { toast } from '@datum-ui/components';
import { useState } from 'react';
import { MetaFunction, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>New</span>,
};
export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New DNS Zone');
});

export default function DnsZoneNewPage() {
  const { projectId } = useParams();
  const [createdData, setCreatedData] = useState<{
    dnsZone: DnsZone;
    dnsDiscovery: DnsZoneDiscovery;
  } | null>(null);

  const createDnsZoneDiscovery = useCreateDnsZoneDiscovery(projectId ?? '', {
    onSuccess: (dnsDiscovery, dnsZoneId) => {
      // Discovery was created successfully, but we need the dnsZone from the outer scope
      // This is handled in the createDnsZone.onSuccess callback
    },
    onError: (error) => {
      toast.error('Error', {
        description: error.message || 'Failed to create DNS zone discovery',
      });
    },
  });

  const createDnsZone = useCreateDnsZone(projectId ?? '', {
    onSuccess: (dnsZone) => {
      // After creating DNS zone, create the discovery
      createDnsZoneDiscovery.mutate(dnsZone.name, {
        onSuccess: (dnsDiscovery) => {
          setCreatedData({ dnsZone, dnsDiscovery });
        },
      });
    },
    onError: (error) => {
      toast.error('Error', {
        description: error.message || 'Failed to create DNS zone',
      });
    },
  });

  const handleSubmit = (data: CreateDnsZoneInput) => {
    createDnsZone.mutate(data);
  };

  const isPending = createDnsZone.isPending || createDnsZoneDiscovery.isPending;

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      {createdData?.dnsZone && createdData?.dnsDiscovery ? (
        <DnsZoneDiscoveryPreview
          projectId={projectId ?? ''}
          dnsZoneId={createdData.dnsZone.name ?? ''}
          dnsZoneDiscoveryId={createdData.dnsDiscovery.name ?? ''}
        />
      ) : (
        <DnsZoneForm projectId={projectId ?? ''} onSubmit={handleSubmit} isSubmitting={isPending} />
      )}
    </div>
  );
}
