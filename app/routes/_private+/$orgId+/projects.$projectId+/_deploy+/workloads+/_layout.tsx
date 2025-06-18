import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Workloads</span>,
};

export default function WorkloadsLayout() {
  return <Outlet />;
}
