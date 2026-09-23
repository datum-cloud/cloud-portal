import { IdleChip, OverviewEmptyState } from './overview-empty-state';
import type { OverviewRange } from './overview-range';
import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { StatusPulseDot } from '@/components/status-pulse-dot';
import {
  ALB_LOGS_DENIED_MESSAGE,
  useAlbLogsPermission,
} from '@/features/edge/proxy/hooks/use-alb-logs-permission';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { ALB_LOGS_LIVE_POLL_MS, ALB_LOGS_PREVIEW_LIMIT, useAlbLogs } from '@/resources/o11y-logs';
import { paths } from '@/utils/config/paths.config';
import { AuthorizationError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
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
  logRequestHost,
  parseLogLine,
  type LogEntry,
  type LogTimeRange,
} from '@datum-cloud/datum-ui/logs';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { CheckIcon, CopyIcon, LogsIcon, RadioIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

interface HttpProxyLogsCardProps {
  projectId: string;
  proxyId: string;
  /** Shared overview window so the feed covers the same span as the metrics. */
  range: OverviewRange;
  /** ALB has never seen traffic; shows the first-request prompt with a curl snippet. */
  idle?: boolean;
  /** System-managed hostname used in the test-request snippet. */
  defaultHostname?: string;
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
        <Text size="xs" textColor="muted" ellipsis className="min-w-0 flex-1 font-mono">
          {parsed.line}
        </Text>
        <Text size="xs" textColor="muted" className="shrink-0 tabular-nums">
          {relativeAge(entry.timestamp)}
        </Text>
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
          className="text-3xs h-5 w-11 shrink-0 justify-center rounded-md px-0 font-mono font-medium tabular-nums">
          {parsed.status}
        </Badge>
        <Text size="3xs" weight="medium" textColor="muted" className="w-12 shrink-0 font-mono">
          {parsed.method}
        </Text>
        <Text size="xs" ellipsis className="min-w-0 flex-1 font-mono" title={parsed.path}>
          {parsed.path}
        </Text>
        {host ? (
          <Text size="xs" textColor="muted" ellipsis className="hidden max-w-40 shrink-0 lg:inline">
            {host}
          </Text>
        ) : null}
        <Text
          size="xs"
          className={cn(
            'w-14 shrink-0 text-right font-mono tabular-nums',
            parsed.durationMs >= 1000 ? 'text-(--color-badge-warning)' : 'text-muted-foreground'
          )}>
          {parsed.durationMs >= 1000
            ? `${(parsed.durationMs / 1000).toFixed(1)}s`
            : `${Math.round(parsed.durationMs)}ms`}
        </Text>
        <Text size="xs" textColor="muted" className="w-16 shrink-0 text-right tabular-nums">
          {relativeAge(entry.timestamp)}
        </Text>
      </Link>
    </li>
  );
}

/**
 * Most recent access-log lines as flush rows. The Logs tab owns filtering and
 * the detail panel; this is a glanceable feed that links there.
 */
export const HttpProxyLogsCard = ({
  projectId,
  proxyId,
  range,
  idle = false,
  defaultHostname,
}: HttpProxyLogsCardProps) => {
  const { hasPermission, isLoading: permLoading } = useAlbLogsPermission();
  const [, copy, isCopied] = useCopyToClipboard();
  const { start, end } = range.timeRange;
  const timeRange = useMemo<LogTimeRange>(
    () => ({ from: start.toISOString(), to: end.toISOString() }),
    [start, end]
  );

  const logsQuery = useAlbLogs(
    projectId,
    proxyId,
    {
      timeRange,
      limit: ALB_LOGS_PREVIEW_LIMIT,
      enabled: hasPermission,
    },
    { refetchInterval: ALB_LOGS_LIVE_POLL_MS }
  );

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
  const empty = !isLoading && !denied && !errorMessage && entries.length === 0;
  const testCommand = defaultHostname ? `curl -I https://${defaultHostname}/` : null;

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
          {empty ? <IdleChip /> : null}
        </CardTitle>
        <CardDescription className="text-xs">
          Most recent requests · {range.label.toLowerCase()}
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
          <Text
            as="div"
            textColor="muted"
            className="flex h-full items-center justify-center px-(--card-px) text-center">
            <Tooltip message={errorMessage}>
              <span>Unable to load recent requests.</span>
            </Tooltip>
          </Text>
        ) : entries.length === 0 ? (
          <OverviewEmptyState
            icon={RadioIcon}
            title={
              idle
                ? 'Waiting for the first request…'
                : `No requests in the ${range.label.toLowerCase()}`
            }
            description={
              idle
                ? 'Send a test request and it will appear here live.'
                : 'New requests appear here live as they arrive.'
            }>
            {idle && testCommand ? (
              <div className="bg-muted/60 border-border flex w-full max-w-sm items-center gap-2 rounded-md border py-1.5 pr-1.5 pl-3 text-left">
                <code className="min-w-0 flex-1 font-mono text-xs break-all">{testCommand}</code>
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="xs"
                  className="text-muted-foreground size-6 shrink-0 p-0"
                  aria-label="Copy test request command"
                  onClick={() => copy(testCommand, { withToast: true })}>
                  <Icon icon={isCopied(testCommand) ? CheckIcon : CopyIcon} size={12} />
                </Button>
              </div>
            ) : null}
          </OverviewEmptyState>
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
