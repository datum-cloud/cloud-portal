import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>DNS Zones</span>,
};

export default function DnsZonesLayout() {
  return <Outlet />;
}
