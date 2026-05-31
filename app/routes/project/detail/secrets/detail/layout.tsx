import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runDetailLoader } from '@/modules/rbac/run-resource-loader';
import { createSecretService, secretKeys, type Secret } from '@/resources/secrets';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { type LoaderFunctionArgs, Outlet, useParams } from 'react-router';

const route = defineResourceRoute<Secret>({
  type: 'detail',
  resource: 'secrets',
  paramName: 'secretId',
  notFoundLabel: 'Secret',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view this secret.",
  breadcrumb: ({ data }) => <span>{data?.name ?? 'Secret'}</span>,
  metaTitle: ({ data }) => data?.name ?? 'Secret',
  seedCache: ({ data, projectId, id }) => {
    const d = data as Secret;
    return [[secretKeys.detail(projectId, id), d]] as never;
  },
});

export const loader = (args: LoaderFunctionArgs) =>
  runDetailLoader<Secret, Record<string, never>>(args, {
    resource: 'secrets',
    group: '',
    scope: 'project',
    paramName: 'secretId',
    notFoundLabel: 'Secret',
    fetch: ({ projectId, id }) => createSecretService().get(projectId!, id),
  });

export const handle = route.handle;
export const meta = route.meta;

export default route.Page(({ data: secret }) => {
  const { projectId, secretId } = useParams();

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
    <SubLayout title={secret?.name ?? 'Secret'} navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
});
