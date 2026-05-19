import { type SubNavigationTab } from '@/components/sub-navigation';
import { SubLayout } from '@/layouts';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';
import { Outlet, useParams } from 'react-router';

export default function TeamListLayout() {
  const { orgId } = useParams();

  const navItems: SubNavigationTab[] = useMemo(
    () => [
      { label: 'Members', href: getPathWithParams(paths.org.detail.team.root, { orgId }) },
      { label: 'Groups', href: getPathWithParams(paths.org.detail.team.groups, { orgId }) },
    ],
    [orgId]
  );

  return (
    <SubLayout title="Team" navItems={navItems}>
      <Outlet />
    </SubLayout>
  );
}
