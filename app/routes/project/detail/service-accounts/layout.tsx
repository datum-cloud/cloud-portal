import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Service Accounts</span>,
};

export default function ServiceAccountsLayout() {
  return <Outlet />;
}
