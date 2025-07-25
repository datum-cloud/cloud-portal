import { PageTitle } from '@/components/page-title/page-title';
import { AccountGeneralCard } from '@/features/account/settings/general-card';
import { mergeMeta, metaObject } from '@/utils/meta';
import { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Account settings</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Account settings');
});

export default function ProjectSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageTitle title="Account settings" />
      {/* Project Name Section */}
      <AccountGeneralCard />
    </div>
  );
}
