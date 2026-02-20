import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Connectors</span>,
};

export default function ConnectorsLayout() {
  return <Outlet />;
}
