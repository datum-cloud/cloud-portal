import {
  projectNlbBytesQuery,
  projectNlbBytesRateQuery,
  projectNlbCountQuery,
  projectNlbDroppedQuery,
  projectNlbDroppedRateQuery,
  projectNlbPacketsQuery,
  projectNlbPacketsRateQuery,
  useNlbListHref,
} from './nlb-traffic';
import {
  projectErrorRateQuery,
  projectRequestCountQuery,
  projectRpsQuery,
  projectWafBlockedQuery,
} from '@/features/edge/proxy/metrics/queries';
import { SparklineStatCard } from '@/features/edge/proxy/overview/sparkline-stat-card';
import { usePrometheusAPIQuery } from '@/modules/metrics/hooks';
import type { MetricCardData } from '@/modules/prometheus';
import { useHttpProxies } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Sparkline resolution: 48 points across the day. */
const STEP = '30m';
/**
 * The error-rate sparkline averages over a rolling 2h window. Quiet projects
 * see a handful of requests per step, where one 404 swings the ratio between
 * 0% and 100%; the longer window shows the trend instead of that noise.
 */
const ERROR_RATE_WINDOW = '2h';
const REQUESTS_TITLE = 'Requests served';
const NLB_BYTES_TITLE = 'NLB data received';

/**
 * Whether the tiles for one kind of load balancer have anything to draw:
 * the project has one, and it saw traffic in the last day.
 */
function tilesFor(count: number, traffic: number | undefined) {
  const quiet = count > 0 && traffic === 0;
  return { has: count > 0, quiet, show: count > 0 && !quiet };
}

/**
 * The last 24 hours of traffic across every load balancer in the project.
 * The tiles always render, idle until the project has a load balancer, so
 * the page doesn't shift when the load balancer list arrives.
 */
export function ProjectTraffic({ projectId }: { projectId: string }) {
  const { data: proxies = [], isLoading } = useHttpProxies(projectId, {
    staleTime: QUERY_STALE_TIME,
  });

  const timeRange = useMemo(() => {
    const end = new Date();
    return { start: new Date(end.getTime() - DAY_MS), end };
  }, []);

  // The same query, under the same key, as the "Requests served" tile, so it
  // is fetched once. A day with no requests gets one line instead of three
  // tiles of zeros.
  const requestsQuery = projectRequestCountQuery(projectId, '24h');
  const { data: requests } = usePrometheusAPIQuery<MetricCardData>(
    ['alb-stat', REQUESTS_TITLE, requestsQuery, timeRange.start.getTime(), timeRange.end.getTime()],
    { type: 'card', projectId, query: requestsQuery, timeRange, metricFormat: 'short-number' },
    { enabled: proxies.length > 0 }
  );

  // NLBs live in the networking plugin, so they're counted from their
  // metrics: every programmed listener records a backends series.
  const nlbCountQuery = projectNlbCountQuery(projectId, '24h');
  const { data: nlbCount, isLoading: nlbCountLoading } = usePrometheusAPIQuery<MetricCardData>(
    ['nlb-count', nlbCountQuery, timeRange.start.getTime(), timeRange.end.getTime()],
    { type: 'card', projectId, query: nlbCountQuery, timeRange, metricFormat: 'number' },
    {}
  );
  const nlbs = nlbCount?.value ?? 0;
  // Shares its key with the "NLB data received" tile, like requests above.
  const nlbBytesQuery = projectNlbBytesQuery(projectId, '24h');
  const { data: nlbBytes } = usePrometheusAPIQuery<MetricCardData>(
    [
      'alb-stat',
      NLB_BYTES_TITLE,
      nlbBytesQuery,
      timeRange.start.getTime(),
      timeRange.end.getTime(),
    ],
    { type: 'card', projectId, query: nlbBytesQuery, timeRange, metricFormat: 'bytes' },
    { enabled: nlbs > 0 }
  );
  const nlbHref = useNlbListHref(projectId);

  const alb = tilesFor(proxies.length, requests?.value);
  const nlb = tilesFor(nlbs, nlbBytes?.value);
  const quiet = (alb.has || nlb.has) && !alb.show && !nlb.show;

  const href = getPathWithParams(paths.project.detail.proxy.root, { projectId });
  const idle = !isLoading && !nlbCountLoading && !alb.has && !nlb.has;
  // Until both kinds are known, hold the ALB tiles' place so the page doesn't
  // shift, as it always has while the ALB list loads.
  const albPending = isLoading || (!alb.has && nlbCountLoading);
  const shared = {
    timeRange,
    step: STEP,
    rangeLabel: 'Last 24h',
  };

  const total = proxies.length + nlbs;
  const scope =
    total > 1 ? `all ${total} of this project's load balancers` : "this project's load balancers";
  const description = idle
    ? 'Add a load balancer to see its traffic here.'
    : quiet
      ? // An NLB carries packets, not requests.
        `No ${nlb.has ? 'traffic' : 'requests'} to ${scope} in the last 24 hours.`
      : `Traffic across ${scope} over the last 24 hours.`;

  return (
    <section
      aria-labelledby="project-home-traffic-heading"
      className="flex flex-col gap-3"
      data-testid="project-home-traffic">
      <div className="flex flex-col gap-0.5">
        {/* The same heading as Activity: the title links to the full view. */}
        <h2 id="project-home-traffic-heading" className="flex h-7 items-center">
          <Link to={href} className="text-foreground flex items-center gap-1 text-sm font-medium">
            Traffic
            <Icon icon={ChevronRight} size={14} className="text-icon-quaternary" aria-hidden />
          </Link>
        </h2>
        <Text as="p" size="xs" textColor="muted">
          {description}
        </Text>
      </div>
      {/* With nothing to chart, the heading and its one line say it all;
          three empty tiles would outweigh everything that has content. */}
      {!idle && !quiet && (alb.show || albPending) && (
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
          <SparklineStatCard
            projectId={projectId}
            title={REQUESTS_TITLE}
            query={projectRpsQuery(projectId, STEP)}
            valueQuery={requestsQuery}
            format="short-number"
            precision={1}
            href={href}
            pending={albPending}
            {...shared}
          />
          <SparklineStatCard
            projectId={projectId}
            title="Error rate (4xx + 5xx)"
            query={projectErrorRateQuery(projectId, ERROR_RATE_WINDOW)}
            valueQuery={projectErrorRateQuery(projectId, '24h')}
            format="percent"
            color="var(--color-chart-1)"
            href={href}
            pending={albPending}
            {...shared}
          />
          <SparklineStatCard
            projectId={projectId}
            title="Blocked by WAF"
            query={projectWafBlockedQuery(projectId, STEP)}
            valueQuery={projectWafBlockedQuery(projectId, '24h')}
            format="short-number"
            precision={0}
            color="var(--color-chart-1)"
            href={href}
            pending={albPending}
            {...shared}
          />
        </div>
      )}
      {nlb.show && (
        <div
          className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3"
          data-testid="project-home-nlb-traffic">
          <SparklineStatCard
            projectId={projectId}
            title={NLB_BYTES_TITLE}
            query={projectNlbBytesRateQuery(projectId, STEP)}
            valueQuery={nlbBytesQuery}
            format="bytes"
            precision={1}
            href={nlbHref}
            {...shared}
          />
          <SparklineStatCard
            projectId={projectId}
            title="NLB packets received"
            query={projectNlbPacketsRateQuery(projectId, STEP)}
            valueQuery={projectNlbPacketsQuery(projectId, '24h')}
            format="short-number"
            precision={1}
            href={nlbHref}
            {...shared}
          />
          <SparklineStatCard
            projectId={projectId}
            title="NLB dropped packets"
            query={projectNlbDroppedRateQuery(projectId, STEP)}
            valueQuery={projectNlbDroppedQuery(projectId, '24h')}
            format="short-number"
            precision={0}
            color="var(--color-chart-1)"
            href={nlbHref}
            {...shared}
          />
        </div>
      )}
    </section>
  );
}
