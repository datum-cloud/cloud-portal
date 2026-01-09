import { ActivityLogList } from '@/features/activity-log/list';
import { useApp } from '@/providers/app.provider';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Activity');
});

export default function AccountSettingsActivityPage() {
  const { user } = useApp();
  return <ActivityLogList params={{ user: user?.email }} />;
}
