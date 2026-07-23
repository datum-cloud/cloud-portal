import { AccountPasskeysCard } from '@/features/account/cards/passkeys-card';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Security');
});

export default function AccountSecuritySettingsPage() {
  return (
    <Row gutter={[0, 16]}>
      <Col span={24}>
        <AccountPasskeysCard />
      </Col>
    </Row>
  );
}
