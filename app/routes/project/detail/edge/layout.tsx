import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>ALB</span>,
};

export default function HttpProxyLayout() {
  return <Outlet />;
}
