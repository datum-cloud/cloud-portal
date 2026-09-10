import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import {
  ALB_LOGS_DENIED_MESSAGE,
  useAlbLogsPermission,
} from '@/features/edge/proxy/hooks/use-alb-logs-permission';
import { AlbLogsPreview } from '@/features/edge/proxy/logs/alb-logs-preview';
import { ALB_LOGS_PREVIEW_LIMIT, useAlbLogs } from '@/resources/o11y-logs';
import { paths } from '@/utils/config/paths.config';
import { AuthorizationError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { lastThirtyMinutes } from '@datum-cloud/datum-ui/logs';
import { LogsIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

interface HttpProxyLogsCardProps {
  projectId: string;
  proxyId: string;
}

export const HttpProxyLogsCard = ({ projectId, proxyId }: HttpProxyLogsCardProps) => {
  const { hasPermission, isLoading: permLoading } = useAlbLogsPermission();
  const [timeRange] = useState(() => lastThirtyMinutes());

  const logsQuery = useAlbLogs(projectId, proxyId, {
    timeRange,
    limit: ALB_LOGS_PREVIEW_LIMIT,
    enabled: hasPermission,
  });

  const denied = !permLoading && (!hasPermission || logsQuery.error instanceof AuthorizationError);
  const errorMessage =
    logsQuery.error && !(logsQuery.error instanceof AuthorizationError)
      ? logsQuery.error.message
      : undefined;

  const logsHref = getPathWithParams(paths.project.detail.proxy.detail.logs, {
    projectId,
    proxyId,
  });

  return (
    <Card className="relative flex h-[22rem] w-full flex-col overflow-hidden rounded-xl px-3 py-4 shadow sm:h-[24rem] sm:pt-6 sm:pb-4">
      {denied && <RestrictedOverlay message={ALB_LOGS_DENIED_MESSAGE} />}
      <CardContent className="flex min-h-0 flex-1 flex-col gap-5 p-0 sm:px-6 sm:pb-4">
        <div className="flex shrink-0 items-center gap-2.5">
          <Icon icon={LogsIcon} size={20} className="text-secondary stroke-2" />
          <span className="text-base font-semibold">Logs</span>
          <Link
            to={logsHref}
            className="text-primary ml-auto text-sm font-medium hover:underline"
            data-e2e="alb-logs-view-all">
            View all
          </Link>
        </div>

        <AlbLogsPreview
          entries={logsQuery.data ?? []}
          isLoading={permLoading || logsQuery.isLoading}
          error={errorMessage}
        />
      </CardContent>
    </Card>
  );
};
