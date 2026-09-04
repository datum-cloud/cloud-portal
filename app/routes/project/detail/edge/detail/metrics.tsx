import { useAlbTrafficProtection } from '@/features/edge/proxy/hooks/use-alb-traffic-protection';
import { HttpProxyEdgeRequests } from '@/features/edge/proxy/metrics/edge-requests';
import { HttpProxyErrorRate } from '@/features/edge/proxy/metrics/error-rate';
import { HttpProxyMetricsKpis } from '@/features/edge/proxy/metrics/kpi-cards';
import { HttpProxyLatencyPercentiles } from '@/features/edge/proxy/metrics/latency-percentiles';
import { albSeriesMatch } from '@/features/edge/proxy/metrics/queries';
import { HttpProxyRegionalErrors } from '@/features/edge/proxy/metrics/regional-errors';
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
import { MetricsProvider, MetricsToolbar, RegionsFilter } from '@/modules/metrics';
import { useGuardedRouteData } from '@/modules/rbac';
import { type HttpProxy } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
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
      <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow-none sm:pt-6 sm:pb-4">
        <CardContent className="flex flex-col gap-5 p-0 sm:px-6 sm:pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">{title}</h2>
            {actions}
          </div>
          {children}
        </CardContent>
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
        <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />
        <div
          className={cn(
            'bg-background sticky top-[-1.75rem] z-10 -mx-4 mb-6 px-4 py-2 md:top-[-2.25rem] md:-mx-9 md:px-9',
            stuck && 'border-border border-b'
          )}>
          <MetricsToolbar>
            <MetricsToolbar.Filters>
              <RegionsFilter match={seriesMatch} />
              <StatusClassFilter />
            </MetricsToolbar.Filters>
            <MetricsToolbar.CoreControls />
          </MetricsToolbar>
        </div>

        <div className="flex flex-col gap-6">
          <HttpProxyMetricsKpis projectId={projectId} proxyId={proxyId} showWaf={wafEnabled} />

          <MetricsSection id="traffic" title="Traffic">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <HttpProxyEdgeRequests projectId={projectId} proxyId={proxyId} />
              <HttpProxyStatusCodes projectId={projectId} proxyId={proxyId} />
            </div>
            <HttpProxyErrorRate projectId={projectId} proxyId={proxyId} />
          </MetricsSection>

          <MetricsSection id="latency" title="Latency">
            <HttpProxyLatencyPercentiles projectId={projectId} proxyId={proxyId} />
          </MetricsSection>

          <MetricsSection id="geography" title="Geography">
            <ActivePopsCard projectId={projectId} proxyId={proxyId} embedded />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <HttpProxyUpstreamRps projectId={projectId} proxyId={proxyId} />
              <HttpProxyRegionalErrors projectId={projectId} proxyId={proxyId} />
            </div>
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
                <HttpProxyWafEvents
                  projectId={projectId}
                  proxyId={proxyId}
                  trafficProtectionMode={effectiveProxy.trafficProtectionMode}
                />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <HttpProxyWafSeverity projectId={projectId} proxyId={proxyId} />
                  <HttpProxyWafMethods projectId={projectId} proxyId={proxyId} />
                </div>
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
