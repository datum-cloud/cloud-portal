import { PageTitle } from '@/components/page-title/page-title';
import { AccountDangerSettingsCard } from '@/features/account/settings/danger-card';
import { AccountIdentitySettingsCard } from '@/features/account/settings/indetity-card';
import { AccountLoginProviderCard } from '@/features/account/settings/login-provider-card';
import { AccountPortalSettingsCard } from '@/features/account/settings/portal-card';
import { AccountProfileSettingsCard } from '@/features/account/settings/profile-card';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import type { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Preferences</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Account Preferences');
});

export default function AccountPreferencesPage() {
  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <PageTitle title="Preferences" />
      <AccountProfileSettingsCard />

      <AccountIdentitySettingsCard />

      <AccountLoginProviderCard />

      <AccountPortalSettingsCard />

      {/* <AccountNewsletterSettingsCard /> */}

      <AccountDangerSettingsCard />
    </div>
  );
}
