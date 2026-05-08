import { BackButton } from '@/components/back-button';
import { SubLayout } from '@/layouts';
import { createSecretService, useSecret, type Secret } from '@/resources/secrets';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { useMemo } from 'react';
import { LoaderFunctionArgs, MetaFunction, Outlet, useLoaderData, useParams } from 'react-router';

export const handle = {
  breadcrumb: (data: Secret) => <span>{data?.name}</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const secret = loaderData as Secret;
  return metaObject(secret?.name || 'Secret');
});

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId, secretId } = params;

  if (!projectId || !secretId) {
    throw new BadRequestError('Project ID and secret ID are required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const secretService = createSecretService();
  const secret = await secretService.get(projectId, secretId);

  return secret;
};

export default function SecretDetailLayout() {
  const secret = useLoaderData<typeof loader>();
  const { projectId, secretId } = useParams();

  // Seed cache synchronously with SSR data so child routes read it without skeleton flash
  useSecret(projectId ?? '', secretId ?? '', {
    initialData: secret,
    initialDataUpdatedAt: Date.now(),
  });

  const navItems: NavItem[] = useMemo(() => {
    const id = secretId ?? secret?.name ?? '';
    return [
      {
        title: 'Overview',
        href: getPathWithParams(paths.project.detail.secrets.detail.overview, {
          projectId,
          secretId: id,
        }),
        type: 'link',
      },
      {
        title: 'Activity',
        href: getPathWithParams(paths.project.detail.secrets.detail.activity, {
          projectId,
          secretId: id,
        }),
        type: 'link',
      },
    ];
  }, [projectId, secretId, secret?.name]);

  return (
    <SubLayout
      sidebarHeader={
        <div className="flex flex-col gap-5.5">
          <BackButton
            className="hidden md:flex"
            to={getPathWithParams(paths.project.detail.secrets.root, {
              projectId,
            })}>
            Back to Secrets
          </BackButton>
          <span className="text-primary text-sm font-semibold">Manage Secret</span>
        </div>
      }
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
