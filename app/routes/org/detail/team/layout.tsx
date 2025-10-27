import { standardOrgMiddleware, withMiddleware } from '@/utils/middlewares';
import { Outlet, data } from 'react-router';

export const loader = withMiddleware(async () => {
  return data({});
}, standardOrgMiddleware);

export default function Layout() {
  return <Outlet />;
}
