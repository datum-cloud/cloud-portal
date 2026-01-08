import { PageTitle } from '@/components/page-title/page-title';
import { AccountProfileSettingsCard } from '@/features/account/settings/profile-card';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-ui/components/grid';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('General');
});

export default function AccountGeneralSettingsPage() {
  return (
    <div className="flex w-full flex-col gap-9">
      <Row gutter={[0, 16]}>
        <Col span={24}>
          <PageTitle title="Your Profile" titleClassName="text-base" />
        </Col>
        <Col span={24}>
          <AccountProfileSettingsCard />
        </Col>
      </Row>
    </div>
  );
  // return (
  //   <div className="mx-auto flex w-full flex-col gap-6">
  //     <PageTitle title="Preferences" />
  //     <AccountProfileSettingsCard />

  //     <AccountIdentitySettingsCard />

  //     <AccountLoginProviderCard />

  //     <AccountPortalSettingsCard />

  //     {/* <AccountNewsletterSettingsCard /> */}

  //     <AccountDangerSettingsCard />
  //   </div>
  // );
}
