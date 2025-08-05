import { paths } from '@/config/paths';
import { setOrgSession } from '@/modules/cookie/org.server';
import { redirectWithToast } from '@/modules/cookie/toast.server';
import { useApp } from '@/providers/app.provider';
import { ROUTE_PATH as ORG_DETAIL_PATH } from '@/routes/api/organizations/$id';
import { CustomError } from '@/utils/error';
import { getPathWithParams } from '@/utils/path';
import { useEffect } from 'react';
import { LoaderFunctionArgs, Outlet, data, useLoaderData } from 'react-router';

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const { orgId } = params;

    if (!orgId) {
      throw new CustomError('Organization ID is required', 400);
    }

    const res = await fetch(
      `${process.env.APP_URL}${getPathWithParams(ORG_DETAIL_PATH, { orgId })}`,
      {
        method: 'GET',
        headers: {
          Cookie: request.headers.get('Cookie') || '',
        },
      }
    );

    const org = await res.json();

    const { headers } = await setOrgSession(request, org);

    return data(org, { headers });
  } catch {
    return redirectWithToast(paths.account.organizations.root, {
      title: 'Error',
      description: 'Organization not found',
      type: 'error',
    });
  }
}

export default function OrgLayout() {
  const org = useLoaderData<typeof loader>();

  const { setOrganization } = useApp();

  useEffect(() => {
    if (org) {
      setOrganization(org);
    }
  }, [org]);

  return <Outlet />;
}
