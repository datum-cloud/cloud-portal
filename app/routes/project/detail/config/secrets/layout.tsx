import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Secrets</span>,
};

export default function SecretsLayout() {
  return <Outlet />;
}
