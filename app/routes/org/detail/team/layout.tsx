import { standardOrgMiddleware, withMiddleware } from '@/modules/middleware';
import { Outlet, data } from 'react-router';

export const loader = withMiddleware(async () => {
  return data({});
}, standardOrgMiddleware);

export default function Layout() {
  return <Outlet />;
}
