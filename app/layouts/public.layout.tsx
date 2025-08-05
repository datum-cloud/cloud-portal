import { paths } from '@/config/paths';
import { getSession, isAuthenticated } from '@/modules/cookie/session.server';
import { LoaderFunctionArgs, Outlet, redirect } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  const isLoggedIn = await isAuthenticated(request);
  if (isLoggedIn) {
    const session = await getSession(request);
    return redirect(paths.home, { headers: session?.headers });
  }

  return null;
}

export default function PublicLayout() {
  return <Outlet />;
}
