import { useApp } from '@/providers/app.provider';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import type { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Logs</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Logs'));

export default function HttpProxyLogsPage() {
  const { user } = useApp();
  const userName = user?.givenName?.trim() || undefined;

  return (
    <EmptyContent
      className="w-full [&>div]:!max-w-[360px]"
      size="lg"
      userName={userName}
      title="Logs coming soon"
      subtitle="Request logs for this ALB will appear here."
    />
  );
}
