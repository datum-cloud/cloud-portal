import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { MetaFunction } from 'react-router';
import { Outlet } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Support</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Support');
});

export default function SupportLayout() {
  return <Outlet />;
}
