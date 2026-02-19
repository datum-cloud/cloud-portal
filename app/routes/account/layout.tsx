import { clearSentryOrgContext, clearSentryProjectContext } from '@/modules/sentry';
import { useApp } from '@/providers/app.provider';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useEffect } from 'react';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>My Account</span>,
  path: () => getPathWithParams(paths.account.settings.general),
};

export default function AccountLayout() {
  const { setOrganization, setProject } = useApp();

  useEffect(() => {
    setOrganization(undefined);
    setProject(undefined);
    clearSentryOrgContext();
    clearSentryProjectContext();
  }, [setOrganization, setProject]);

  return <Outlet />;
}
