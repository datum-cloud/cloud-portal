import { BadgeStatus } from '@/components/badge/badge-status';
import { type ColumnDef, Table } from '@/components/table';
import { useGuardedRouteData } from '@/modules/rbac';
import { ControlPlaneStatus } from '@/resources/base';
import type { DnsZone } from '@/resources/dns-zones';
import type { Domain } from '@/resources/domains';
import {
  describeLinkFailure,
  type PrivateZoneVpcLink,
  usePrivateZoneVpcLinks,
} from '@/resources/private-dns';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useMemo } from 'react';
import { useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>VPCs</span>,
};

const LINK_STATUS: Record<
  PrivateZoneVpcLink['state'],
  { status: ControlPlaneStatus; label: string }
> = {
  linked: { status: ControlPlaneStatus.Success, label: 'Linked' },
  linking: { status: ControlPlaneStatus.Pending, label: 'Linking' },
  failed: { status: ControlPlaneStatus.Error, label: 'Not linked' },
};

export default function DnsZoneVpcsPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: dnsZone } = useGuardedRouteData<DnsZone, { domain: Domain | null }>(
    'dns-zone-detail'
  );
  const { links, access, isLoading } = usePrivateZoneVpcLinks(projectId, dnsZone);

  const columns: ColumnDef<PrivateZoneVpcLink>[] = useMemo(
    () => [
      {
        id: 'vpc',
        header: 'VPC',
        accessorKey: 'label',
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5" data-e2e="private-zone-vpc">
            <span className="font-medium">{row.original.label}</span>
            {row.original.isOwner && (
              <Text size="xs" textColor="muted">
                Default zone for this VPC
              </Text>
            )}
          </div>
        ),
        meta: { sortPath: 'label', sortType: 'text' },
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'state',
        enableSorting: false,
        cell: ({ row }) => {
          const { status, label } = LINK_STATUS[row.original.state];
          return (
            <BadgeStatus
              status={status}
              label={label}
              showTooltip={row.original.state === 'failed'}
              tooltipText={describeLinkFailure(row.original.reason, row.original.message)}
              className="rounded-lg px-2 py-0.5"
            />
          );
        },
      },
    ],
    []
  );

  const empty =
    access === 'forbidden'
      ? "You don't have permission to see which VPCs use this zone."
      : access === 'error'
        ? "Couldn't load the VPCs for this zone. Try again shortly."
        : 'No VPCs are linked to this zone, so nothing can resolve its records yet.';

  return (
    <Table.Client
      columns={columns}
      data={access === 'ok' ? links : []}
      title="VPCs"
      description="Resources in these VPCs can resolve this zone's records. Other VPCs and the public internet can't."
      empty={empty}
      loading={isLoading}
      pagination={false}
    />
  );
}
