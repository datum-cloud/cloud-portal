import { LogoIcon } from '@/components/logo/logo-icon';
import { authenticator } from '@/modules/auth/auth.server';
import { setIdTokenSession } from '@/modules/cookie/id-token.server';
import { getSession, setSession } from '@/modules/cookie/session.server';
import { IAuthSession } from '@/resources/interfaces/auth.interface';
import { paths } from '@/utils/config/paths.config';
import { AuthenticationError } from '@/utils/errors';
import { combineHeaders } from '@/utils/helpers/path.helper';
import { jwtDecode } from 'jwt-decode';
import { Loader2 } from 'lucide-react';
import { LoaderFunctionArgs, redirect } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const session = await getSession(request);

    // Redirect if already authenticated
    if (session.session) {
      return redirect(paths.home, { headers: session.headers });
    }

    // Authenticate user
    const credentials: IAuthSession | undefined = await authenticator.authenticate(
      'zitadel',
      request
    );
    if (!credentials) {
      throw new AuthenticationError('Authentication failed');
    }

    const { idToken, ...rest } = credentials;

    // Decode Access token
    const decoded = jwtDecode<{ sub: string; email: string }>(rest.accessToken);

    // Handle auth session
    const { headers: sessionHeaders } = await setSession(request, {
      accessToken: rest.accessToken,
      refreshToken: rest.refreshToken,
      expiredAt: rest.expiredAt,
      sub: decoded.sub,
    });

    // Handle id token session
    let idTokenHeaders: Headers | undefined;
    if (idToken) {
      const idTokenResponse = await setIdTokenSession(request, idToken);
      idTokenHeaders = idTokenResponse.headers;
    }

    // Combine headers
    const headers = combineHeaders(sessionHeaders, idTokenHeaders);

    // Redirect to organizations
    return redirect(paths.account.organizations.root, { headers: headers });
  } catch {
    return redirect(paths.auth.logIn);
  }
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
      <LogoIcon width={32} className="mb-4" />

      <>
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <h2 className="text-xl font-semibold">Authenticating...</h2>
        <p className="text-muted-foreground text-sm">Setting up your account...</p>
      </>
    </div>
  );
}
