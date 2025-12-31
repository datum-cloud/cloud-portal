import { MinimalLayout } from '@/layouts/minimal.layout';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { data, MetaFunction } from 'react-router';
import { Outlet } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Account Organizations');
});

export const action = async () => {
  return data({ error: 'Method not allowed on layout route' }, { status: 405 });
};

export default function Layout() {
  return (
    <MinimalLayout>
      <Outlet />
    </MinimalLayout>
  );
}
