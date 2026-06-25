import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import type { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Activity'));

export default function WorkloadActivityPage() {
  return (
    <EmptyContent
      variant="dashed"
      title="Activity coming soon"
      subtitle="Event history and audit logs for this workload aren't available yet."
    />
  );
}
