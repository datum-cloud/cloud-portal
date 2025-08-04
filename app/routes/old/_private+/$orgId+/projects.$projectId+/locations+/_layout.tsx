import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Locations</span>,
};

export default function LocationsLayout() {
  return <Outlet />;
}
