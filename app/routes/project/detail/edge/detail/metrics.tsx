import { useAlbTrafficProtection } from '@/features/edge/proxy/hooks/use-alb-traffic-protection';
import { HttpProxyEdgeRequests } from '@/features/edge/proxy/metrics/edge-requests';
import { HttpProxyErrorRate } from '@/features/edge/proxy/metrics/error-rate';
import { HttpProxyMetricsKpis } from '@/features/edge/proxy/metrics/kpi-cards';
import { HttpProxyLatencyPercentiles } from '@/features/edge/proxy/metrics/latency-percentiles';
import { albSeriesMatch } from '@/features/edge/proxy/metrics/queries';
import { HttpProxyRegionalErrors } from '@/features/edge/proxy/metrics/regional-errors';
import { HttpProxyRegionsFilter } from '@/features/edge/proxy/metrics/regions-filter';
import { MetricChartPair } from '@/features/edge/proxy/metrics/series-legend';
import { StatusClassFilter } from '@/features/edge/proxy/metrics/status-class-filter';
import { HttpProxyStatusCodes } from '@/features/edge/proxy/metrics/status-codes';
import { HttpProxyUpstreamRps } from '@/features/edge/proxy/metrics/upstream-rps';
import {
  HttpProxyWafSeverity,
  HttpProxyWafMethods,
} from '@/features/edge/proxy/metrics/waf-breakdown';
import { HttpProxyWafEvents } from '@/features/edge/proxy/metrics/waf-events';
import { WafOutcomeFilter, WafSeverityFilter } from '@/features/edge/proxy/metrics/waf-filters';
import { HttpProxyWafTopRules } from '@/features/edge/proxy/metrics/waf-top-rules';
import { ActivePopsCard } from '@/features/edge/proxy/overview/active-pops-card';
import { ChartScaleGroup, MetricsProvider, MetricsToolbar } from '@/modules/metrics';
import { useGuardedRouteData } from '@/modules/rbac';
import { type HttpProxy } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, type MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Metrics</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Metrics'));

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

function useStuckOnScroll() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      threshold: 0,
      root: getScrollParent(sentinel),
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, stuck };
}

function MetricsSection({
  id,
  title,
  children,
  actions,
}: {
  id: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card size="sm" sectioned className="w-full overflow-hidden">
        <CardHeader size="sm" bordered>
          <CardTitle className="text-sm">{title}</CardTitle>
          {actions ? <CardAction>{actions}</CardAction> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">{children}</CardContent>
      </Card>
    </section>
  );
}

export default function HttpProxyMetricsPage() {
  const { data: proxy } = useGuardedRouteData<HttpProxy, Record<string, never>>('proxy-detail');
  const { projectId = '', proxyId = '' } = useParams<{ projectId: string; proxyId: string }>();
  const { effectiveProxy, wafEnabled, canViewWaf, wafPending } = useAlbTrafficProtection(
    projectId,
    proxyId,
    proxy
  );

  const { sentinelRef, stuck } = useStuckOnScroll();

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, '');
    if (!id) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!effectiveProxy) throw new NotFoundError('Application Load Balancer', proxyId);

  const overviewHref = getPathWithParams(paths.project.detail.proxy.detail.overview, {
    projectId,
    proxyId,
  });
  const seriesMatch = albSeriesMatch(projectId, proxyId);

  return (
    <MetricsProvider>
      <div className="flex flex-col">
        {/* -mb-px so the 1px sentinel doesn't push the toolbar below other tabs' content. */}
        <div ref={sentinelRef} className="-mb-px h-px w-full shrink-0" aria-hidden />
        <div
          className={cn(
            // pt-2 lines the 32px controls up with the sidebar's Home item when
            // stuck; -mt-2 cancels it at rest so the controls start where other
            // tabs' content does. pb-2.5 (8px + the menu's 2px gap) puts the
            // stuck border on the sidebar's separator line, and mb-3.5 brings
            // the gap to the KPI cards back to 24px like the overview.
            'bg-background sticky top-[-1.75rem] z-30 -mx-4 -mt-2 mb-3.5 px-4 pt-2 pb-2.5 md:top-[-2.25rem] md:-mx-9 md:px-9',
            stuck && 'border-border border-b'
          )}>
          <MetricsToolbar>
            <MetricsToolbar.Filters>
              <HttpProxyRegionsFilter projectId={projectId} match={seriesMatch} />
              <StatusClassFilter />
            </MetricsToolbar.Filters>
            <MetricsToolbar.CoreControls />
          </MetricsToolbar>
        </div>

        <div className="flex flex-col gap-6">
          <HttpProxyMetricsKpis
            projectId={projectId}
            proxyId={proxyId}
            showWaf={wafEnabled}
            wafPending={wafPending}
          />

          <MetricsSection id="traffic" title="Traffic">
            <MetricChartPair>
              <HttpProxyEdgeRequests projectId={projectId} proxyId={proxyId} />
              <HttpProxyStatusCodes projectId={projectId} proxyId={proxyId} />
            </MetricChartPair>
            <HttpProxyErrorRate projectId={projectId} proxyId={proxyId} />
          </MetricsSection>

          <MetricsSection id="latency" title="Latency">
            <HttpProxyLatencyPercentiles projectId={projectId} proxyId={proxyId} />
          </MetricsSection>

          <MetricsSection id="geography" title="Geography">
            <ActivePopsCard projectId={projectId} proxyId={proxyId} embedded />
            <MetricChartPair>
              <HttpProxyUpstreamRps projectId={projectId} proxyId={proxyId} />
              <HttpProxyRegionalErrors projectId={projectId} proxyId={proxyId} />
            </MetricChartPair>
          </MetricsSection>

          <MetricsSection
            id="protection"
            title="Traffic Protection"
            actions={
              wafEnabled && canViewWaf ? (
                <div className="flex flex-wrap items-center gap-2">
                  <WafOutcomeFilter />
                  <WafSeverityFilter match={seriesMatch} />
                </div>
              ) : undefined
            }>
            {wafPending ? (
              <p className="text-muted-foreground text-sm">Loading traffic protection…</p>
            ) : wafEnabled && canViewWaf ? (
              <div className="flex flex-col gap-6">
                <ChartScaleGroup>
                  <HttpProxyWafEvents
                    projectId={projectId}
                    proxyId={proxyId}
                    trafficProtectionMode={effectiveProxy.trafficProtectionMode}
                  />
                  <MetricChartPair>
                    <HttpProxyWafSeverity projectId={projectId} proxyId={proxyId} />
                    <HttpProxyWafMethods projectId={projectId} proxyId={proxyId} />
                  </MetricChartPair>
                </ChartScaleGroup>
                <HttpProxyWafTopRules projectId={projectId} proxyId={proxyId} />
              </div>
            ) : wafEnabled ? (
              <p className="text-muted-foreground text-sm">
                You don&apos;t have permission to view traffic protection metrics.
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Traffic protection is not enabled for this load balancer.{' '}
                <LinkButton as={Link} type="primary" theme="link" size="link" href={overviewHref}>
                  Configure it on Overview
                </LinkButton>
              </p>
            )}
          </MetricsSection>
        </div>
      </div>
    </MetricsProvider>
  );
}
