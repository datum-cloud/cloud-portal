import { paths } from '@/utils/config/paths.config';
import {
  destroyAlertState,
  destroyIdTokenSession,
  destroyOrgSession,
  destroyRefreshToken,
  destroySession,
} from '@/utils/cookies';
import { combineHeaders } from '@/utils/helpers/path.helper';
import { redirect } from 'react-router';

export const destroyLocalSessions = async (request: Request) => {
  const { headers: sessionHeaders } = await destroySession(request);
  const { headers: refreshHeaders } = await destroyRefreshToken(request);
  const { headers: orgHeaders } = await destroyOrgSession(request);
  const { headers: idTokenHeaders } = await destroyIdTokenSession(request);
  const { headers: alertHeaders } = await destroyAlertState(request);

  return redirect(paths.auth.logIn, {
    headers: combineHeaders(
      sessionHeaders,
      refreshHeaders,
      orgHeaders,
      idTokenHeaders,
      alertHeaders
    ),
  });
};
