import { PageTitle } from '@/components/page-title/page-title';
import { EditSecretKeys } from '@/features/secret/form/edit/edit-keys';
import { SecretDangerCard } from '@/features/secret/form/overview/danger-card';
import { SecretGeneralCard } from '@/features/secret/form/overview/general-card';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { Row, Col } from '@datum-ui/components';
import { useRouteLoaderData } from 'react-router';

export default function EditSecret() {
  const secret = useRouteLoaderData<ISecretControlResponse>('secret-detail');

  return (
    <div className="mx-auto w-full">
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <PageTitle title={secret?.name ?? 'Secret'} />
        </Col>
        <Col span={24}>
          <SecretGeneralCard secret={secret ?? {}} />
        </Col>
        <Col span={24}>
          <EditSecretKeys defaultValue={secret} />
        </Col>
        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Delete Secret</h3>
          <SecretDangerCard secret={secret ?? {}} />
        </Col>
      </Row>
    </div>
  );
}
