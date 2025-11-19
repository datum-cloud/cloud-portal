import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Proxy</span>,
};

export default function HttpProxyLayout() {
  return <Outlet />;
}
