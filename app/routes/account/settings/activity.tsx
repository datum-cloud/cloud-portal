import { ActivityLogTable } from '@/features/activity-log';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Activity');
});

export default function AccountSettingsActivityPage() {
  return <ActivityLogTable scope={{ type: 'user', userId: 'me' }} />;
}
