import { routes } from '@/constants/routes';
import { organizationCookie } from '@/utils/cookies';
import { getPathWithParams } from '@/utils/helpers';
import { LoaderFunctionArgs, redirect } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const org = await organizationCookie.get(request);

  if (org) {
    return redirect(getPathWithParams(routes.org.root, { orgId: org.data?.id }));
  }

  return redirect(routes.account.organizations.root);
};

export default function MainIndex() {
  return <></>;
}
