import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { Outlet, useParams } from 'react-router';

export default function ServiceAccountsListingLayout() {
  const { projectId } = useParams();

  const navItems: SubNavigationTab[] = useMemo(() => {
    return [
      {
        label: 'Create a Service Account',
        href: getPathWithParams(paths.project.detail.serviceAccounts.new, {
          projectId,
        }),
      },
      {
        label: 'Your Service Accounts',
        href: getPathWithParams(paths.project.detail.serviceAccounts.root, {
          projectId,
        }),
      },
    ];
  }, [projectId]);

  return (
    <SubLayout title="Service Accounts" navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
