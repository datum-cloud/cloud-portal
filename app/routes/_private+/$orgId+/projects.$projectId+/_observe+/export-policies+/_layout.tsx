import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Export Policies</span>,
};

export default function ExportPoliciesLayout() {
  return <Outlet />;
}
