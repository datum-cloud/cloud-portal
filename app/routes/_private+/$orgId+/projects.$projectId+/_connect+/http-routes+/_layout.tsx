import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>HTTP Routes</span>,
};

export default function HttpRoutesLayout() {
  return <Outlet />;
}
