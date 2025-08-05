import { mergeMeta, metaObject } from '@/utils/meta';
import { MetaFunction } from 'react-router';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Projects</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Projects');
});

export default function Layout() {
  return <Outlet />;
}
