import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import { createSecretService, useSecret, type Secret } from '@/resources/secrets';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError, withLoaderErrors } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { LoaderFunctionArgs, MetaFunction, Outlet, useLoaderData, useParams } from 'react-router';

export const handle = {
  breadcrumb: (data: Secret) => <span>{data?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const secret = loaderData as Secret;
  return metaObject(secret?.name || 'Secret');
});

export const loader = withLoaderErrors(async ({ params }: LoaderFunctionArgs) => {
  const { projectId, secretId } = params;

  if (!projectId || !secretId) {
    throw new BadRequestError('Project ID and secret ID are required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const secretService = createSecretService();
  const secret = await secretService.get(projectId, secretId);

  if (!secret) {
    throw new NotFoundError('Secret', secretId);
  }

  return secret;
});

export default function SecretDetailLayout() {
  const secret = useLoaderData<typeof loader>();
  const { projectId, secretId } = useParams();

  // Seed cache synchronously with SSR data so child routes read it without skeleton flash
  useSecret(projectId ?? '', secretId ?? '', {
    initialData: secret,
    initialDataUpdatedAt: Date.now(),
  });

  const navItems: SubNavigationTab[] = useMemo(() => {
    const id = secretId ?? secret?.name ?? '';
    return [
      {
        label: 'Overview',
        href: getPathWithParams(paths.project.detail.secrets.detail.overview, {
          projectId,
          secretId: id,
        }),
      },
      {
        label: 'Activity',
        href: getPathWithParams(paths.project.detail.secrets.detail.activity, {
          projectId,
          secretId: id,
        }),
      },
    ];
  }, [projectId, secretId, secret?.name]);

  return (
    <SubLayout title={secret?.name} navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
