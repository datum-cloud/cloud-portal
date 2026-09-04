import {
  albErrorRateQuery,
  albLatencyQuantileQuery,
  albRpsQuery,
  albWafIncreaseQuery,
  scopeFromContext,
  stepOr,
  windowDuration,
} from '@/features/edge/proxy/metrics/queries';
import { MetricCard } from '@/modules/metrics';

export function HttpProxyMetricsKpis({
  projectId,
  proxyId,
  showWaf,
}: {
  projectId: string;
  proxyId: string;
  showWaf?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        title="Requests"
        query={(ctx) => albRpsQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))}
        metricFormat="requestsPerSecond"
        className="shadow-none"
      />
      <MetricCard
        title="Error rate"
        query={(ctx) => albErrorRateQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))}
        metricFormat="percent"
        className="shadow-none"
      />
      <MetricCard
        title="p95 latency"
        query={(ctx) =>
          albLatencyQuantileQuery(0.95, scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))
        }
        metricFormat="milliseconds-auto"
        className="shadow-none"
      />
      {showWaf ? (
        <MetricCard
          title="WAF blocked"
          query={(ctx) =>
            albWafIncreaseQuery(
              {
                ...scopeFromContext(ctx, projectId, proxyId),
                wafOutcomes: undefined,
                customLabels: { coraza_outcome: '=~"blocked|dropped"' },
              },
              windowDuration(ctx)
            )
          }
          metricFormat="short-number"
          precision={0}
          className="shadow-none"
        />
      ) : null}
    </div>
  );
}
