import { ActivityLogTable } from '@/features/activity-log';
import { useApp } from '@/providers/app.provider';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Activity');
});

export default function AccountSettingsActivityPage() {
  const { user } = useApp();
  return <ActivityLogTable scope={{ type: 'user', userId: user?.sub ?? 'me' }} />;
}
