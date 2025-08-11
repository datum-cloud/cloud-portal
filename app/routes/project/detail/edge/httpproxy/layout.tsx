import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>HTTPProxy</span>,
};

export default function HttpProxyLayout() {
  return <Outlet />;
}
