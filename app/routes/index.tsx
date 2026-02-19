import { paths } from '@/utils/config/paths.config';
import { getOrgSession, getProjectSession } from '@/utils/cookies';
import { combineHeaders } from '@/utils/helpers/path.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { LoaderFunctionArgs, redirect } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Get active org and project from cookies
  const { orgId, headers: orgHeaders } = await getOrgSession(request);
  const { projectId, headers: projectHeaders } = await getProjectSession(request);

  // Combine headers from both cookie operations
  const headers = combineHeaders(orgHeaders, projectHeaders);

  // If both org and project exist, redirect to project home
  if (orgId && projectId) {
    return redirect(getPathWithParams(paths.project.detail.home, { projectId }), { headers });
  }

  // If only org exists, redirect to org projects page
  if (orgId) {
    return redirect(getPathWithParams(paths.org.detail.projects.root, { orgId }), { headers });
  }

  // Otherwise, redirect to organizations list
  return redirect(paths.account.organizations.root, { headers });
};
