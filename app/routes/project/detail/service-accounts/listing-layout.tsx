import { SubLayout } from '@/layouts';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { useMemo } from 'react';
import { Outlet, useParams } from 'react-router';

export default function ServiceAccountsListingLayout() {
  const { projectId } = useParams();

  const navItems: NavItem[] = useMemo(() => {
    return [
      {
        title: 'Create a Service Account',
        href: getPathWithParams(paths.project.detail.serviceAccounts.new, {
          projectId,
        }),
        type: 'link',
      },
      {
        title: 'Your Service Accounts',
        href: getPathWithParams(paths.project.detail.serviceAccounts.root, {
          projectId,
        }),
        type: 'link',
        excludePaths: [
          getPathWithParams(paths.project.detail.serviceAccounts.new, {
            projectId,
          }),
        ],
      },
    ];
  }, [projectId]);

  return (
    <SubLayout
      sidebarHeader={<span className="text-primary text-sm font-semibold">Service Accounts</span>}
      navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
