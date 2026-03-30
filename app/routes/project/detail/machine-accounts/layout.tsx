import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Machine Accounts</span>,
};

export default function MachineAccountsLayout() {
  return <Outlet />;
}
