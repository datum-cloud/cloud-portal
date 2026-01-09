import { PageTitle } from '@/components/page-title/page-title';
import { AccountDangerSettingsCard } from '@/features/account/cards/danger-card';
import { AccountIdentitySettingsCard } from '@/features/account/cards/identity-card';
import { AccountProfileSettingsCard } from '@/features/account/cards/profile-card';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-ui/components/grid';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('General');
});

export default function AccountGeneralSettingsPage() {
  return (
    <Row gutter={[0, 36]}>
      <Col span={24}>
        <Row gutter={[0, 16]}>
          <Col span={24}>
            <PageTitle title="Your Profile" titleClassName="text-base" />
          </Col>
          <Col span={24}>
            <AccountProfileSettingsCard />
          </Col>
          <Col span={24}>
            <AccountIdentitySettingsCard />
          </Col>
        </Row>
      </Col>

      <Row gutter={[0, 16]}>
        <Col span={24}>
          <PageTitle title="Delete Account" titleClassName="text-base" />
        </Col>
        <Col span={24}>
          <AccountDangerSettingsCard />
        </Col>
      </Row>
    </Row>
  );
}
