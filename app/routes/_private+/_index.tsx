import { routes } from '@/constants/routes';
import { getOrgSession } from '@/modules/cookie/org.server';
import { getPathWithParams } from '@/utils/path';
import { LoaderFunctionArgs, redirect } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { org } = await getOrgSession(request);

  if (!org) {
    return redirect(routes.account.organizations.root);
  }

  return redirect(getPathWithParams(routes.org.projects.root, { orgId: org.id }));
};
