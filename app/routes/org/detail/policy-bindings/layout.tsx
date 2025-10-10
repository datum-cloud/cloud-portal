import { standardOrgMiddleware, withMiddleware } from '@/modules/middleware';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { MetaFunction, data } from 'react-router';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Policy Bindings</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Policy Bindings');
});

export const loader = withMiddleware(async () => {
  return data({});
}, standardOrgMiddleware);

export default function Layout() {
  return <Outlet />;
}
