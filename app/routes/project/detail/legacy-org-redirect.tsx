import { getProjectForRequest } from '@/resources/projects/project-request-cache.server';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { type LoaderFunctionArgs, redirect } from 'react-router';

/**
 * Usage and billing used to have project pages (`/project/:projectId/usage`
 * and the project Settings › Billing tab). Both are the organization's now,
 * so old links go to the project's org: usage filtered to the project, and
 * the org's billing page.
 */
export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const projectId = params.projectId ?? '';
  const project = await getProjectForRequest(projectId).catch(() => null);
  const orgId = project?.organizationId;
  if (!orgId) return redirect(paths.account.organizations.root);

  const billing = new URL(request.url).pathname.endsWith('/billing');
  return redirect(
    billing
      ? getPathWithParams(paths.org.detail.billing.root, { orgId })
      : getPathWithParams(paths.org.detail.usage, { orgId }, { project: projectId }),
    308
  );
};

export default function ProjectLegacyOrgRedirect() {
  return null;
}
