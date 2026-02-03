import { clearSentryOrgContext, clearSentryProjectContext } from '@/modules/sentry';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useEffect } from 'react';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>My Account</span>,
  path: () => getPathWithParams(paths.account.settings.general),
};

export default function AccountLayout() {
  // Clear org/project context when entering account pages
  // (account pages are outside org/project scope)
  useEffect(() => {
    clearSentryOrgContext();
    clearSentryProjectContext();
  }, []);

  return <Outlet />;
}
