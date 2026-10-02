import { useAlbTrafficProtection } from '@/features/edge/proxy/hooks/use-alb-traffic-protection';
import { ActivePopsCard } from '@/features/edge/proxy/overview/active-pops-card';
import { HttpProxyEndpointsCard } from '@/features/edge/proxy/overview/endpoints-card';
import { HttpProxyHealthStrip } from '@/features/edge/proxy/overview/health-strip';
import { HttpProxyLiveTrafficCard } from '@/features/edge/proxy/overview/live-traffic-card';
import { HttpProxyLogsCard } from '@/features/edge/proxy/overview/logs-card';
import { HttpProxyMetricsStrip } from '@/features/edge/proxy/overview/metrics-strip';
import { HttpProxyOriginsCard } from '@/features/edge/proxy/overview/origins-card';
import {
  DEFAULT_OVERVIEW_RANGE,
  type OverviewRangeValue,
  useOverviewRange,
} from '@/features/edge/proxy/overview/overview-range';
import { useAlbTrafficPresence } from '@/features/edge/proxy/overview/use-alb-traffic-presence';
import { MetricsProvider } from '@/modules/metrics';
import { useGuardedRouteData } from '@/modules/rbac';
import { type HttpProxy, useHttpProxy } from '@/resources/http-proxies';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { NotFoundError } from '@/utils/errors';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useState } from 'react';
import { useParams } from 'react-router';

/**
 * Operational dashboard for one ALB: status, live metrics, traffic, and the
 * recent request feed. Editing and deletion live on the Configuration tab.
 */
/** Height of the fixed-size dashboard panels (feed height on small screens too). */
const PANEL_HEIGHT = 'h-[27rem]';

export default function HttpProxyOverviewPage() {
  const { data: proxy } = useGuardedRouteData<HttpProxy, Record<string, never>>('proxy-detail');
  const { projectId = '', proxyId = '' } = useParams<{ projectId: string; proxyId: string }>();
  const [rangeValue, setRangeValue] = useState<OverviewRangeValue>(DEFAULT_OVERVIEW_RANGE);
  const range = useOverviewRange(rangeValue);

  const { data: httpProxy } = useHttpProxy(projectId, proxyId, {
    initialData: proxy,
    staleTime: QUERY_STALE_TIME,
  });

  const { canViewWaf, wafUnavailable, wafPending, wafEnabled, effectiveProxy } =
    useAlbTrafficProtection(projectId, proxyId, httpProxy ?? proxy);

  const resourceName = effectiveProxy?.name ?? proxyId;
  // One shared "has this ALB ever seen traffic?" signal drives the first-run
  // empty states so the panels don't disagree with each other.
  const traffic = useAlbTrafficPresence(projectId, resourceName);

  if (!effectiveProxy) throw new NotFoundError('Application Load Balancer', proxyId);

  const defaultHostname = effectiveProxy.canonicalHostname ?? effectiveProxy.status?.hostnames?.[0];

  return (
    <div className="flex flex-col gap-4">
      <HttpProxyHealthStrip
        proxy={effectiveProxy}
        projectId={projectId}
        canViewWaf={canViewWaf}
        wafPending={wafPending}
        wafUnavailable={wafUnavailable}
        idle={traffic.idle}
      />
      {/* Two columns on lg: hostnames, backend pool, and the request feed on
          the left; traffic chart, stat cards, and locations on the right. The
          left wrapper is `display: contents` below lg so a single column can
          stack the feed last instead of right after the backend pool. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="contents lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
          {/* shrink-0: both cards clip overflow, so flex would squash them. */}
          <div className="shrink-0">
            <HttpProxyEndpointsCard proxy={effectiveProxy} projectId={projectId} />
          </div>
          <div className="shrink-0">
            <HttpProxyOriginsCard
              proxy={effectiveProxy}
              projectId={projectId}
              className="border-0"
            />
          </div>
          {/* On lg the feed fills whatever height the right column leaves.
              Absolute so its rows scroll inside instead of stretching the grid. */}
          <div
            className={cn(
              PANEL_HEIGHT,
              'relative order-last lg:order-none lg:h-auto lg:min-h-80 lg:flex-1'
            )}>
            <div className="absolute inset-0">
              <HttpProxyLogsCard
                projectId={projectId}
                proxyId={resourceName}
                range={range}
                idle={traffic.idle}
                defaultHostname={defaultHostname}
              />
            </div>
          </div>
        </div>
        <div className={cn(PANEL_HEIGHT, 'lg:col-start-2')}>
          <HttpProxyLiveTrafficCard
            projectId={projectId}
            proxyId={resourceName}
            range={range}
            onRangeChange={setRangeValue}
            idle={traffic.idle}
          />
        </div>
        <div className="lg:col-start-2">
          <HttpProxyMetricsStrip
            projectId={projectId}
            proxyId={resourceName}
            range={range}
            showWaf={wafEnabled}
            wafPending={wafPending}
            idle={traffic.idle}
          />
        </div>
        <div className={cn(PANEL_HEIGHT, 'lg:col-start-2')}>
          <MetricsProvider>
            <ActivePopsCard projectId={projectId} proxyId={resourceName} />
          </MetricsProvider>
        </div>
      </div>
    </div>
  );
}
