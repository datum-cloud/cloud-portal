import { AccountNotificationSettingsCard } from '@/features/account/cards/notification-card';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-ui/components/grid';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Notifications');
});

export default function AccountNotificationsSettingsPage() {
  return (
    <Row gutter={[0, 16]}>
      <Col span={24}>
        <AccountNotificationSettingsCard />
      </Col>
    </Row>
  );
}
