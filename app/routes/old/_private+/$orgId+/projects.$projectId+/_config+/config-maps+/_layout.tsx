import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Config Maps</span>,
};

export default function ConfigMapsLayout() {
  return <Outlet />;
}
