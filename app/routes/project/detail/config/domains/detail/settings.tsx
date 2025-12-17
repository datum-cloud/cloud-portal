import { ComingSoonFeatureCard } from '@/components/coming-soon/coming-soon-feature-card';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { PageTitle } from '@/components/page-title/page-title';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { ROUTE_PATH as DOMAINS_ACTIONS_PATH } from '@/routes/api/domains';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Col, Row } from '@datum-ui/components';
import { useParams, useRouteLoaderData } from 'react-router';

export default function DomainSettingsPage() {
  const { domain } = useRouteLoaderData('domain-detail');

  const { projectId } = useParams();

  const fetcher = useDatumFetcher({ key: 'delete-domain' });

  const { confirm } = useConfirmationDialog();

  const deleteDomain = async () => {
    await confirm({
      title: 'Delete Domain',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{domain.domainName}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: false,
      onSubmit: async () => {
        await fetcher.submit(
          {
            id: domain?.name ?? '',
            projectId: projectId ?? '',
            redirectUri: getPathWithParams(paths.project.detail.domains.root, {
              projectId,
            }),
          },
          {
            method: 'DELETE',
            action: DOMAINS_ACTIONS_PATH,
          }
        );
      },
    });
  };

  return (
    <Row gutter={[24, 32]}>
      <Col span={24}>
        <PageTitle title="Settings" />
      </Col>
      <Col span={24}>
        <h3 className="mb-4 text-base font-medium">Coming Soon</h3>
        <ComingSoonFeatureCard
          title="Global DNS Healthcheck"
          description="Global DNS Healthcheck for nameservers and common record types with details by region"
        />
      </Col>
      <Col span={24}>
        <h3 className="mb-4 text-base font-medium">Delete Domain</h3>
        <DangerCard
          title="Warning: This Action is Irreversible"
          description={`This action cannot be undone. Once deleted, the ${domain?.domainName} domain and all associated data will be permanently removed from Datum. `}
          deleteText="Delete domain"
          loading={fetcher.isPending}
          onDelete={deleteDomain}
        />
      </Col>
    </Row>
  );
}
