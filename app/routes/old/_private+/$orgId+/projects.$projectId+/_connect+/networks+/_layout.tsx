import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Networks</span>,
};

export default function NetworksLayout() {
  return <Outlet />;
}
