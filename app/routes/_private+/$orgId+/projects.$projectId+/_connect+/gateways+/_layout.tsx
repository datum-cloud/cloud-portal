import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Gateways</span>,
};

export default function GatewaysLayout() {
  return <Outlet />;
}
