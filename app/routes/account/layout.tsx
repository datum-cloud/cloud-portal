import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>My Account</span>,
  path: () => getPathWithParams(paths.account.preferences),
};

export default function AccountLayout() {
  return <Outlet />;
}
