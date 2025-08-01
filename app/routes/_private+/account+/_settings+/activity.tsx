import { ActivityLogList } from '@/features/activity-log/activity-log-list';
import { useApp } from '@/providers/app.provider';
import { mergeMeta, metaObject } from '@/utils/meta';
import { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Activity');
});

export default function AccountActivityPage() {
  const { user } = useApp();
  return <ActivityLogList params={{ user: user?.email }} />;
}
