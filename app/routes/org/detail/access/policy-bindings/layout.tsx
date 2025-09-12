import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Policy Bindings</span>,
};

export default function Layout() {
  return <Outlet />;
}
