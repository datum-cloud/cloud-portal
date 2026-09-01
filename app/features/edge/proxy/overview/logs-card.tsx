import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { LogsIcon } from 'lucide-react';

export const HttpProxyLogsCard = () => {
  return (
    <Card className="flex h-[22rem] w-full flex-col overflow-hidden rounded-xl px-3 py-4 shadow sm:h-[24rem] sm:pt-6 sm:pb-4">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-5 p-0 sm:px-6 sm:pb-4">
        <div className="flex shrink-0 items-center gap-2.5">
          <Icon icon={LogsIcon} size={20} className="text-secondary stroke-2" />
          <span className="text-base font-semibold">Logs</span>
        </div>

        <EmptyContent
          size="sm"
          title="Logs coming soon"
          subtitle="Request logs for this ALB will appear here."
          className="min-h-0 w-full flex-1"
        />
      </CardContent>
    </Card>
  );
};
