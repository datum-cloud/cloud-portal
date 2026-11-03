import { zitadelStrategy } from './strategies/zitadel.server';
import { toNativeRequest } from '@/server/native-request';
import type { IAuthSession } from '@/utils/auth';
import { Authenticator } from 'remix-auth';

/**
 * remix-auth copies the request with `new Request(request.url, request)`,
 * which throws "Illegal invocation" on Node 26 when it is @hono/node-server's
 * lightweight request (see toNativeRequest). Hand it a native copy instead.
 */
class NodeAuthenticator<User> extends Authenticator<User> {
  override authenticate(strategy: string, request: Request): Promise<User> {
    return super.authenticate(strategy, toNativeRequest(request));
  }
}

export const authenticator = new NodeAuthenticator<IAuthSession>();

// Register the OAuth2 strategy with the authenticator
authenticator.use(zitadelStrategy, 'zitadel');
