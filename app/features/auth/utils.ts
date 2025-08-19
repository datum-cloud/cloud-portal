import { destroyIdTokenSession } from '@/modules/cookie/id-token.server';
import { destroyOrgSession } from '@/modules/cookie/org.server';
import { destroySession } from '@/modules/cookie/session.server';
import { paths } from '@/utils/config/paths.config';
import { combineHeaders } from '@/utils/helpers/path.helper';
import { AppLoadContext, redirect } from 'react-router';

export const destroyLocalSessions = async (request: Request, context: AppLoadContext) => {
  const { cache } = context;
  await cache.clear();

  const { headers: sessionHeaders } = await destroySession(request);
  const { headers: orgHeaders } = await destroyOrgSession(request);
  const { headers: idTokenHeaders } = await destroyIdTokenSession(request);

  return redirect(paths.auth.logIn, {
    headers: combineHeaders(sessionHeaders, orgHeaders, idTokenHeaders),
  });
};
