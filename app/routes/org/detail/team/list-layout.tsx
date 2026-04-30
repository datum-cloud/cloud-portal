import { SubNavigationTabs, type SubNavigationTab } from '@/components/sub-navigation';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
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
    <div className="flex h-full flex-1 flex-col gap-8">
      <PageTitle title="Team" />
      <SubNavigationTabs tabs={navItems} />
      <div className="h-full w-full pt-2">
        <div className="flex h-full flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
