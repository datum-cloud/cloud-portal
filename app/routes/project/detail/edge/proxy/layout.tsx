import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>AI Edge</span>,
};

export default function HttpProxyLayout() {
  return <Outlet />;
}
