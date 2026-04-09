import { PrometheusService } from '@/modules/prometheus';
import { env } from '@/utils/env/env.server';
import { tool } from 'ai';
import { z } from 'zod';

interface MetricsToolDeps {
  accessToken?: string;
}

export function createMetricsTools({ accessToken }: MetricsToolDeps) {
  return {
    getProjectMetrics: tool({
      description:
        'Get live traffic metrics: request rate, error rate, p95 latency, and status-code breakdown.' +
        ' When edgeName is omitted, returns project-wide aggregates plus a per-AI-Edge summary.' +
        ' When edgeName is provided, returns metrics for that single AI Edge resource.' +
        ' Call this when the user asks about traffic, requests, errors, latency, or performance.',
      inputSchema: z.object({
        projectId: z.string().describe('The project k8s name (e.g. "my-project-abc123")'),
        edgeName: z
          .string()
          .optional()
          .describe(
            'Optional AI Edge gateway_name to scope metrics to a single resource. Omit for project-wide.'
          ),
        windowMinutes: z
          .number()
          .int()
          .min(1)
          .max(1440)
          .default(1440)
          .describe('Look-back window in minutes (default 1440 = 24 hours)'),
      }),
      execute: async ({
        projectId,
        edgeName,
        windowMinutes,
      }: {
        projectId: string;
        edgeName?: string;
        windowMinutes: number;
      }) => {
        if (!env.server.prometheusUrl || !accessToken) {
          return { error: 'Metrics are not available' };
        }

        const prometheus = new PrometheusService({
          baseURL: env.server.prometheusUrl,
          timeout: 15000,
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const w = `${windowMinutes}m`;
        const proj = `resourcemanager_datumapis_com_project_name="${projectId}"`;

        const sel = (...extra: string[]) => {
          const parts = [
            `resourcemanager_datumapis_com_project_name="${projectId}"`,
            'gateway_namespace="default"',
            ...(edgeName ? [`gateway_name="${edgeName}"`] : []),
            ...extra,
          ];
          return `{${parts.join(',')}}`;
        };

        const rq = (code: string) =>
          `envoy_vhost_vcluster_upstream_rq${sel(`envoy_response_code=~"${code}"`)}`;
        const bucket = () => `envoy_vhost_vcluster_upstream_rq_time_bucket${sel()}`;

        // --- Core queries (always run) ---
        const queries = [
          /* 0 */ prometheus.queryForCard(`sum(rate(${rq('[12]..')}[${w}]))`, 'number'),
          /* 1 */ prometheus.queryForCard(`sum(rate(${rq('[45]..')}[${w}]))`, 'number'),
          /* 2 */ prometheus.queryForCard(
            `histogram_quantile(0.5, sum by(le) (rate(${bucket()}[${w}])))`,
            'number'
          ),
          /* 3 */ prometheus.queryForCard(
            `histogram_quantile(0.95, sum by(le) (rate(${bucket()}[${w}])))`,
            'number'
          ),
          /* 4 */ prometheus.queryForCard(
            `histogram_quantile(0.99, sum by(le) (rate(${bucket()}[${w}])))`,
            'number'
          ),
          /* 5 */ prometheus.queryForCard(`sum(increase(${rq('[1-5]..')}[${w}]))`, 'number'),
          /* 6 */ prometheus.queryInstant(
            `sum by(envoy_response_code) (increase(${rq('[1-5]..')}[${w}]))`
          ),
          /* 7 - per-region RPS */ prometheus.queryInstant(
            `sum by(label_topology_kubernetes_io_region) (rate(${rq('[1-5]..')}[${w}]))`
          ),
          /* 8 - per-region errors */ prometheus.queryInstant(
            `sum by(label_topology_kubernetes_io_region) (rate(${rq('[45]..')}[${w}]))`
          ),
          /* 9 - export pipeline sent */ prometheus.queryForCard(
            `sum(rate(vector_component_sent_events_total{${proj},component_kind="sink"}[${w}]))`,
            'number'
          ),
          /* 10 - export pipeline errors */ prometheus.queryForCard(
            `sum(rate(vector_component_errors_total{${proj},error_type="request_failed"}[${w}]))`,
            'number'
          ),
        ];

        // --- Per-edge queries (only when project-wide) ---
        if (!edgeName) {
          queries.push(
            /* 11 */ prometheus.queryInstant(`sum by(gateway_name) (rate(${rq('[1-5]..')}[${w}]))`),
            /* 12 */ prometheus.queryInstant(`sum by(gateway_name) (rate(${rq('[45]..')}[${w}]))`),
            /* 13 */ prometheus.queryInstant(
              `histogram_quantile(0.95, sum by(le, gateway_name) (rate(${bucket()}[${w}])))`
            )
          );
        }

        const results = await Promise.allSettled(queries);

        const getCard = (r: PromiseSettledResult<{ value: number }>) =>
          r.status === 'fulfilled' && Number.isFinite(r.value.value) ? r.value.value : null;

        type InstantResult = Array<{
          metric: Record<string, string>;
          value?: [number, string];
        }>;
        const parseInstant = (r: PromiseSettledResult<unknown>): InstantResult =>
          r.status === 'fulfilled'
            ? ((r.value as { data?: { result?: InstantResult } })?.data?.result ?? [])
            : [];

        const parseVal = (r: { value?: [number, string] }) => {
          const raw = r.value?.[1];
          return raw !== undefined ? parseFloat(raw) : NaN;
        };

        const successRps = getCard(results[0] as PromiseSettledResult<{ value: number }>) ?? 0;
        const errorRps = getCard(results[1] as PromiseSettledResult<{ value: number }>) ?? 0;
        const p50Ms = getCard(results[2] as PromiseSettledResult<{ value: number }>);
        const p95Ms = getCard(results[3] as PromiseSettledResult<{ value: number }>);
        const p99Ms = getCard(results[4] as PromiseSettledResult<{ value: number }>);
        const totalRequests = getCard(results[5] as PromiseSettledResult<{ value: number }>) ?? 0;

        const round3 = (n: number) => Math.round(n * 1000) / 1000;

        const codeBreakdown: Record<string, number> = {};
        for (const r of parseInstant(results[6])) {
          const code = r.metric?.envoy_response_code;
          const val = parseVal(r);
          if (code && Number.isFinite(val) && val > 0) codeBreakdown[code] = Math.round(val);
        }

        // --- Per-region breakdown ---
        const regionRps: Record<string, number> = {};
        for (const r of parseInstant(results[7])) {
          const region = r.metric?.label_topology_kubernetes_io_region;
          const val = parseVal(r);
          if (region && Number.isFinite(val)) regionRps[region] = val;
        }
        const regionErrorRps: Record<string, number> = {};
        for (const r of parseInstant(results[8])) {
          const region = r.metric?.label_topology_kubernetes_io_region;
          const val = parseVal(r);
          if (region && Number.isFinite(val)) regionErrorRps[region] = val;
        }
        const regions = [...new Set([...Object.keys(regionRps), ...Object.keys(regionErrorRps)])];
        const perRegion = regions.map((region) => {
          const rps = regionRps[region] ?? 0;
          const errRps = regionErrorRps[region] ?? 0;
          return {
            region,
            requestsPerSecond: round3(rps),
            errorRps: round3(errRps),
            errorRate: rps > 0 ? Math.round((errRps / rps) * 10000) / 100 : 0,
          };
        });

        // --- Export pipeline health ---
        const exportSentRate = getCard(results[9] as PromiseSettledResult<{ value: number }>) ?? 0;
        const exportErrorRate =
          getCard(results[10] as PromiseSettledResult<{ value: number }>) ?? 0;

        const totalRps = successRps + errorRps;

        const aggregate = {
          windowMinutes,
          ...(edgeName ? { edgeName } : {}),
          requestsPerSecond: round3(totalRps),
          successRps: round3(successRps),
          errorRps: round3(errorRps),
          errorRate: totalRps > 0 ? Math.round((errorRps / totalRps) * 10000) / 100 : 0,
          latency: {
            p50Ms: p50Ms !== null ? Math.round(p50Ms) : null,
            p95Ms: p95Ms !== null ? Math.round(p95Ms) : null,
            p99Ms: p99Ms !== null ? Math.round(p99Ms) : null,
          },
          totalRequests: Math.round(totalRequests),
          requestsByStatusCode: Object.keys(codeBreakdown).length > 0 ? codeBreakdown : undefined,
          perRegion: perRegion.length > 0 ? perRegion : undefined,
          exportPipeline: {
            eventsPerSecond: round3(exportSentRate),
            errorsPerSecond: round3(exportErrorRate),
            healthy: exportErrorRate === 0 || exportSentRate > exportErrorRate * 10,
          },
          note:
            totalRps === 0
              ? 'No traffic detected in the selected window — the project may have no active AI Edge traffic.'
              : undefined,
        };

        if (edgeName) return aggregate;

        // --- Per-edge breakdown ---
        const perEdgeRps: Record<string, number> = {};
        for (const r of parseInstant(results[11])) {
          const name = r.metric?.gateway_name;
          const val = parseVal(r);
          if (name && Number.isFinite(val)) perEdgeRps[name] = val;
        }

        const perEdgeErrorRps: Record<string, number> = {};
        for (const r of parseInstant(results[12])) {
          const name = r.metric?.gateway_name;
          const val = parseVal(r);
          if (name && Number.isFinite(val)) perEdgeErrorRps[name] = val;
        }

        const perEdgeLatency: Record<string, number> = {};
        for (const r of parseInstant(results[13])) {
          const name = r.metric?.gateway_name;
          const val = parseVal(r);
          if (name && Number.isFinite(val)) perEdgeLatency[name] = val;
        }

        const edgeNames = new Set([
          ...Object.keys(perEdgeRps),
          ...Object.keys(perEdgeErrorRps),
          ...Object.keys(perEdgeLatency),
        ]);

        const perEdge = [...edgeNames].map((name) => {
          const rps = perEdgeRps[name] ?? 0;
          const errRps = perEdgeErrorRps[name] ?? 0;
          return {
            edgeName: name,
            requestsPerSecond: round3(rps),
            errorRps: round3(errRps),
            errorRate: rps > 0 ? Math.round((errRps / rps) * 10000) / 100 : 0,
            p95LatencyMs:
              perEdgeLatency[name] !== undefined ? Math.round(perEdgeLatency[name]) : null,
          };
        });

        return { ...aggregate, perEdge: perEdge.length > 0 ? perEdge : undefined };
      },
    }),
  };
}
