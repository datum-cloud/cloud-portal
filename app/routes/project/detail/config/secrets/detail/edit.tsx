import { PageTitle } from '@/components/page-title/page-title';
import { EditSecretKeys } from '@/features/secret/form/edit/edit-keys';
import { SecretDangerCard } from '@/features/secret/form/overview/danger-card';
import { SecretGeneralCard } from '@/features/secret/form/overview/general-card';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { Row, Col } from '@datum-ui/components';
import { useParams, useRouteLoaderData } from 'react-router';

export default function EditSecret() {
  const secret = useRouteLoaderData<ISecretControlResponse>('secret-detail');
  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <Row gutter={[0, 28]}>
        <Col span={24}>
          <PageTitle title={secret?.name ?? 'Secret'} />
        </Col>
        <Col span={24}>
          <SecretGeneralCard secret={secret ?? {}} />
        </Col>
        <Col span={24}>
          <EditSecretKeys projectId={projectId ?? ''} defaultValue={secret} />
        </Col>
        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Delete Secret</h3>
          <SecretDangerCard secret={secret ?? {}} />
        </Col>
      </Row>
    </div>
  );
}
