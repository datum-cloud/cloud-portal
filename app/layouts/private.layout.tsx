import { routes } from '@/constants/routes';
import { authenticator } from '@/modules/auth/auth.server';
import { LoaderFunctionArgs, Outlet, redirect } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  const isAuthenticated = await authenticator.isAuthenticated(request);
  if (!isAuthenticated) {
    return redirect(routes.auth.logIn);
  }

  return null;
}

export default function PrivateLayout() {
  return <Outlet />;
}
