import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Endpoint Slices</span>,
};

export default function EndpointSlicesLayout() {
  return <Outlet />;
}
