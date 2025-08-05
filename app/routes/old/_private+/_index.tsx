import { paths } from '@/config/paths';
import { redirect } from 'react-router';

export const loader = async () => {
  /* const { orgId } = await getOrgSession(request);

  if (!org) {
    return redirect(paths.account.organizations.root);
  }

  return redirect(getPathWithParams(paths.org.projects.root, { orgId: org.name })); */

  return redirect(paths.account.organizations.root);
};
