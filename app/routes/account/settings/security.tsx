import { Account2FACard } from '@/features/account/cards/2fa-card';
import { AccountSignInMethodSettingsCard } from '@/features/account/cards/sign-in-method-card';
import { AccountTeamAuthCard } from '@/features/account/cards/team-auth-card';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-ui/components/grid';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Security');
});

export default function AccountSecuritySettingsPage() {
  return (
    <Row gutter={[0, 16]}>
      <Col span={24}>
        <AccountSignInMethodSettingsCard />
      </Col>
      <Col span={24}>
        <Account2FACard />
      </Col>
      <Col span={24}>
        <AccountTeamAuthCard />
      </Col>
    </Row>
  );
}
