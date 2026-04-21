import type { loader } from './layout';
import { EditSecretKeys } from '@/features/secret/form/edit/edit-keys';
import { SecretDangerCard } from '@/features/secret/form/overview/danger-card';
import { SecretGeneralCard } from '@/features/secret/form/overview/general-card';
import { useSecret } from '@/resources/secrets';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { useParams, useRouteLoaderData } from 'react-router';

export default function EditSecret() {
  const { projectId, secretId } = useParams();
  const initialData = useRouteLoaderData<typeof loader>('secret-detail');

  // Get live secret data from React Query
  const { data: queryData } = useSecret(projectId ?? '', secretId ?? '', {
    enabled: !!projectId && !!secretId,
  });

  // Use React Query data when available, fallback to SSR data
  const secret = queryData ?? initialData;

  return (
    <div className="mx-auto w-full">
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <PageTitle title={secret?.name ?? 'Secret'} />
        </Col>
        <Col span={24}>
          <SecretGeneralCard secret={(secret ?? {}) as any} />
        </Col>
        <Col span={24}>
          <EditSecretKeys secret={secret} />
        </Col>
        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Delete Secret</h3>
          <SecretDangerCard secret={(secret ?? {}) as any} />
        </Col>
      </Row>
    </div>
  );
}
