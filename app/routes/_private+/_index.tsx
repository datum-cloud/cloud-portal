import { routes } from '@/constants/routes';
import { redirect } from 'react-router';

export const loader = async () => {
  /* const { org } = await getOrgSession(request);

  if (!org) {
    return redirect(routes.account.organizations.root);
  }

  return redirect(getPathWithParams(routes.org.projects.root, { orgId: org.name })); */

  return redirect(routes.account.organizations.root);
};
