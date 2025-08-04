import { ActivityLogList } from '@/features/activity-log/list';
import { mergeMeta, metaObject } from '@/utils/meta';
import { MetaFunction, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Activity');
});

export default function OrgActivityPage() {
  const { orgId } = useParams();
  return <ActivityLogList params={{ organization: orgId }} />;
}
