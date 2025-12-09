import { paths } from '@/utils/config/paths.config';
import { isAuthenticated, isAuthenticatedResult } from '@/utils/cookies';
import { LoaderFunctionArgs, Outlet, redirect } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  const result = await isAuthenticated(request);

  // If result is a Response (redirect), return it
  if (result instanceof Response) {
    return result;
  }

  // If authenticated, use the headers from isAuthenticated (which includes refreshed tokens)
  if (isAuthenticatedResult(result)) {
    return redirect(paths.home, { headers: result.headers });
  }

  return null;
}

export default function PublicLayout() {
  return <Outlet />;
}
