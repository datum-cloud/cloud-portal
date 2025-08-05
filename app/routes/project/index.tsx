import { paths } from '@/config/paths';
import { getOrgSession } from '@/modules/cookie/org.server';
import { getPathWithParams } from '@/utils/path';
import { LoaderFunctionArgs, redirect } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Get active org from session

  const { orgId, headers } = await getOrgSession(request);

  if (!orgId) {
    return redirect(paths.account.organizations.root, { headers });
  }

  return redirect(getPathWithParams(paths.org.detail.projects.root, { orgId }), {
    headers,
  });
};
