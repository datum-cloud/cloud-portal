import { ActivityLogTable } from '@/features/activity-log';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { MetaFunction, useParams } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Org Activity');
});

export default function OrgActivityPage() {
  const { orgId } = useParams();
  if (!orgId) return null;
  return (
    <ActivityLogTable
      scope={{ type: 'organization', organizationId: orgId }}
      initialActions={['Added', 'Modified', 'Deleted']}
    />
  );
}
