import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { StatusPulseDot } from '@/components/status-pulse-dot';
import {
  ALB_LOGS_DENIED_MESSAGE,
  useAlbLogsPermission,
} from '@/features/edge/proxy/hooks/use-alb-logs-permission';
import { ALB_LOGS_PREVIEW_LIMIT, useAlbLogs } from '@/resources/o11y-logs';
import { paths } from '@/utils/config/paths.config';
import { AuthorizationError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import {
  httpStatusBadgeType,
  lastThirtyMinutes,
  logRequestHost,
  parseLogLine,
  type LogEntry,
} from '@datum-cloud/datum-ui/logs';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { LogsIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

interface HttpProxyLogsCardProps {
  projectId: string;
  proxyId: string;
}

const ROW_LIMIT = ALB_LOGS_PREVIEW_LIMIT;

function relativeAge(date: Date): string {
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${formatDistanceToNowStrict(date, { roundingMethod: 'floor' })
    .replace(/ minutes?/, 'm')
    .replace(/ hours?/, 'h')
    .replace(/ days?/, 'd')} ago`;
}

function RequestRow({ entry, logsHref }: { entry: LogEntry; logsHref: string }) {
  const parsed = parseLogLine(entry.line, entry.labels);
  const host = logRequestHost(entry.labels);

  if (parsed.kind !== 'http') {
    return (
      <li className="flex items-center gap-3 px-(--card-px) py-2">
        <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">
          {parsed.line}
        </span>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {relativeAge(entry.timestamp)}
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        to={logsHref}
        className="hover:bg-muted/40 flex items-center gap-3 px-(--card-px) py-2 transition-colors">
        <Badge
          type={httpStatusBadgeType(parsed.status)}
          theme="light"
          className="h-5 w-11 shrink-0 justify-center rounded-md px-0 font-mono text-[11px] font-medium tabular-nums">
          {parsed.status}
        </Badge>
        <span className="text-muted-foreground w-12 shrink-0 font-mono text-[11px] font-medium">
          {parsed.method}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs" title={parsed.path}>
          {parsed.path}
        </span>
        {host ? (
          <span className="text-muted-foreground hidden max-w-40 shrink-0 truncate text-xs lg:inline">
            {host}
          </span>
        ) : null}
        <span
          className={cn(
            'w-14 shrink-0 text-right font-mono text-xs tabular-nums',
            parsed.durationMs >= 1000 ? 'text-(--color-badge-warning)' : 'text-muted-foreground'
          )}>
          {parsed.durationMs >= 1000
            ? `${(parsed.durationMs / 1000).toFixed(1)}s`
            : `${Math.round(parsed.durationMs)}ms`}
        </span>
        <span className="text-muted-foreground w-16 shrink-0 text-right text-xs tabular-nums">
          {relativeAge(entry.timestamp)}
        </span>
      </Link>
    </li>
  );
}

/**
 * Most recent access-log lines as flush rows. The Logs tab owns filtering and
 * the detail panel; this is a glanceable feed that links there.
 */
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

  const entries = useMemo(() => (logsQuery.data ?? []).slice(0, ROW_LIMIT), [logsQuery.data]);
  const isLoading = permLoading || logsQuery.isLoading;

  return (
    <Card
      size="sm"
      sectioned
      className="relative flex h-full flex-col overflow-hidden"
      data-e2e="alb-live-requests">
      {denied && <RestrictedOverlay message={ALB_LOGS_DENIED_MESSAGE} />}
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={LogsIcon} size={16} className="text-secondary" />
          Live requests
          {entries.length > 0 ? <StatusPulseDot variant="active" className="size-4" /> : null}
        </CardTitle>
        <CardDescription className="text-xs">
          Most recent requests · last 30 minutes
        </CardDescription>
        <CardAction>
          <Link
            to={logsHref}
            className="text-primary text-xs font-medium hover:underline"
            data-e2e="alb-logs-view-all">
            View all
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent padding="none" className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <SpinnerIcon size="sm" />
          </div>
        ) : errorMessage ? (
          <div className="text-muted-foreground flex h-full items-center justify-center px-(--card-px) text-center text-sm">
            <Tooltip message={errorMessage}>
              <span>Unable to load recent requests.</span>
            </Tooltip>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center px-(--card-px) text-center text-sm">
            No requests in the last 30 minutes.
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {entries.map((entry) => (
              <RequestRow key={entry.id} entry={entry} logsHref={logsHref} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
