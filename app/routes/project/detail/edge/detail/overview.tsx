import { useAlbTrafficProtection } from '@/features/edge/proxy/hooks/use-alb-traffic-protection';
import { ActivePopsCard } from '@/features/edge/proxy/overview/active-pops-card';
import { HttpProxyEndpointsCard } from '@/features/edge/proxy/overview/endpoints-card';
import { HttpProxyHealthStrip } from '@/features/edge/proxy/overview/health-strip';
import { HttpProxyLiveTrafficCard } from '@/features/edge/proxy/overview/live-traffic-card';
import { HttpProxyLogsCard } from '@/features/edge/proxy/overview/logs-card';
import { HttpProxyMetricsStrip } from '@/features/edge/proxy/overview/metrics-strip';
import {
  DEFAULT_OVERVIEW_RANGE,
  type OverviewRangeValue,
  useOverviewRange,
} from '@/features/edge/proxy/overview/overview-range';
import { MetricsProvider } from '@/modules/metrics';
import { useGuardedRouteData } from '@/modules/rbac';
import { type HttpProxy, useHttpProxy, useHttpProxyWatch } from '@/resources/http-proxies';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { NotFoundError } from '@/utils/errors';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { useState } from 'react';
import { useParams } from 'react-router';

/**
 * Operational dashboard for one ALB: status, live metrics, traffic, and the
 * recent request feed. Editing and deletion live on the Configuration tab.
 */
/** Height of the four dashboard panels below the metrics strip. */
const PANEL_HEIGHT = 'h-[27rem]';

export default function HttpProxyOverviewPage() {
  const { data: proxy } = useGuardedRouteData<HttpProxy, Record<string, never>>('proxy-detail');
  const { projectId = '', proxyId = '' } = useParams<{ projectId: string; proxyId: string }>();
  const [rangeValue, setRangeValue] = useState<OverviewRangeValue>(DEFAULT_OVERVIEW_RANGE);
  const range = useOverviewRange(rangeValue);

  const { data: httpProxy } = useHttpProxy(projectId, proxyId, {
    initialData: proxy,
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  useHttpProxyWatch(projectId, proxyId);

  const { canViewWaf, wafUnavailable, wafPending, wafEnabled, effectiveProxy } =
    useAlbTrafficProtection(projectId, proxyId, httpProxy ?? proxy);

  if (!effectiveProxy) throw new NotFoundError('Application Load Balancer', proxyId);

  const resourceName = effectiveProxy.name ?? proxyId;

  return (
    <Row type="flex" gutter={[24, 24]}>
      <Col span={24}>
        <HttpProxyHealthStrip
          proxy={effectiveProxy}
          canViewWaf={canViewWaf}
          wafPending={wafPending}
          wafUnavailable={wafUnavailable}
        />
      </Col>
      <Col span={24}>
        <HttpProxyMetricsStrip
          projectId={projectId}
          proxyId={resourceName}
          range={range}
          onRangeChange={setRangeValue}
          showWaf={wafEnabled}
          wafPending={wafPending}
        />
      </Col>
      {/* Fixed row heights: the chart fills its card and the lists scroll
          inside theirs instead of growing the page. */}
      <Col span={24} lg={12} className={PANEL_HEIGHT}>
        <HttpProxyLiveTrafficCard projectId={projectId} proxyId={resourceName} range={range} />
      </Col>
      <Col span={24} lg={12} className={PANEL_HEIGHT}>
        <HttpProxyEndpointsCard proxy={effectiveProxy} projectId={projectId} proxyId={proxyId} />
      </Col>
      <Col span={24} lg={12} className={PANEL_HEIGHT}>
        <MetricsProvider>
          <ActivePopsCard projectId={projectId} proxyId={resourceName} />
        </MetricsProvider>
      </Col>
      <Col span={24} lg={12} className={PANEL_HEIGHT}>
        <HttpProxyLogsCard projectId={projectId} proxyId={resourceName} />
      </Col>
    </Row>
  );
}
