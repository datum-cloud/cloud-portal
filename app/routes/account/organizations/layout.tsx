import { MinimalLayout } from '@/layouts/minimal.layout';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { MetaFunction } from 'react-router';
import { Outlet } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Account Organizations');
});

export default function Layout() {
  return (
    <MinimalLayout className="max-w-[1200px]">
      <Outlet />
    </MinimalLayout>
  );
}
