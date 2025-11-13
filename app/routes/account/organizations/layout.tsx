import { MinimalLayout } from '@/layouts/minimal.layout';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { MetaFunction } from 'react-router';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Account Organizations</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Account Organizations');
});

export default function Layout() {
  return (
    <MinimalLayout>
      <Outlet />
    </MinimalLayout>
  );
}
