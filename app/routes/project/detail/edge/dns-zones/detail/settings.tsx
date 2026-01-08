import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { PageTitle } from '@/components/page-title/page-title';
import { ComingSoonCard } from '@/features/edge/dns-zone/overview/coming-soon-card';
import { DescriptionFormCard } from '@/features/edge/dns-zone/overview/description-form-card';
import { useDeleteDnsZone } from '@/resources/dns-zones';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Col, Row } from '@datum-ui/components';
import { useNavigate, useParams, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Settings</span>,
};

export default function DnsZoneSettingsPage() {
  const { projectId } = useParams();
  const { dnsZone } = useRouteLoaderData('dns-zone-detail');
  const navigate = useNavigate();

  const deleteMutation = useDeleteDnsZone(projectId ?? '', {
    onSuccess: () => {
      navigate(
        getPathWithParams(paths.project.detail.dnsZones.root, {
          projectId,
        })
      );
    },
  });

  const { confirm, close: closeConfirmationDialog } = useConfirmationDialog();
  const deleteDnsZone = async () => {
    await confirm({
      title: 'Delete DNS Zone',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{dnsZone?.domainName}</strong>?
        </span>
      ),
      submitText: 'Delete zone',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmValue: dnsZone?.domainName,
      confirmInputLabel: `Type "${dnsZone?.domainName}" to confirm.`,
      onSubmit: async () => {
        closeConfirmationDialog();
        await deleteMutation.mutateAsync(dnsZone?.name ?? '');
      },
    });
  };

  return (
    <div className="flex w-full flex-col gap-8">
      <PageTitle title="Settings" />

      <Row gutter={[0, 24]}>
        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Zone Description</h3>
          <DescriptionFormCard projectId={projectId ?? ''} defaultValue={dnsZone} />
        </Col>

        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Coming Soon</h3>
          <ComingSoonCard />
        </Col>

        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Delete Zone</h3>
          <DangerCard
            title="Warning: This Action is Irreversible"
            description={`This action cannot be undone. Once deleted, the ${dnsZone?.domainName} zone and all associated data will be permanently removed. `}
            deleteText="Delete zone"
            loading={deleteMutation.isPending}
            onDelete={deleteDnsZone}
          />
        </Col>
      </Row>
    </div>
  );
}
