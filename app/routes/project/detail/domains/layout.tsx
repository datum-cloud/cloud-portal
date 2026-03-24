import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Domains</span>,
};

export default function DomainsLayout() {
  return <Outlet />;
}
