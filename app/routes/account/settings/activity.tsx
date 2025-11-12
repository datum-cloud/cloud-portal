import { PageTitle } from '@/components/page-title/page-title';
import { ActivityLogList } from '@/features/activity-log/list';
import { useApp } from '@/providers/app.provider';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Account Activity');
});

export default function AccountActivityPage() {
  const { user } = useApp();
  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <PageTitle title="Activity" />
      <ActivityLogList params={{ user: user?.email }} />
    </div>
  );
}
