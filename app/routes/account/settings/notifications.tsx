import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import type { MetaFunction } from 'react-router';
import { redirect } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Notifications');
});

export async function loader() {
  return redirect(paths.account.settings.general);
}

export default function AccountNotificationsSettingsPage() {
  return null;
}
