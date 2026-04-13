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

    getTrafficProtectionMetrics: tool({
      description:
        'Get WAF / Traffic Protection metrics: rule events, blocked vs allowed requests, top triggered rules, severity breakdown.' +
        ' Queries coraza_envoy_filter_request_events_total from the recording rule.' +
        ' When edgeName is omitted, returns project-wide aggregates plus a per-AI-Edge summary.' +
        ' Call this when the user asks about WAF, traffic protection, blocked requests, security rules, anomaly scores, or OWASP CRS.',
      inputSchema: z.object({
        projectId: z.string().describe('The project k8s name (e.g. "my-project-abc123")'),
        edgeName: z
          .string()
          .optional()
          .describe('Optional AI Edge gateway_name to scope to a single resource.'),
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
        const sel = (...extra: string[]) => {
          const parts = [
            `resourcemanager_datumapis_com_project_name="${projectId}"`,
            ...(edgeName ? [`gateway_name="${edgeName}"`] : []),
            ...extra,
          ];
          return `{${parts.join(',')}}`;
        };
        const metric = `coraza_envoy_filter_request_events_total${sel()}`;

        const queries = [
          /* 0 - by outcome */ prometheus.queryInstant(
            `sum by(coraza_outcome) (increase(${metric}[${w}]))`
          ),
          /* 1 - by severity */ prometheus.queryInstant(
            `sum by(coraza_rule_severity) (increase(${metric}[${w}]))`
          ),
          /* 2 - top rules */ prometheus.queryInstant(
            `topk(10, sum by(coraza_rule_id, coraza_rule_severity, coraza_rule_action) (increase(${metric}[${w}])))`
          ),
          /* 3 - by TTP mode */ prometheus.queryInstant(
            `sum by(trafficprotectionpolicy_mode) (increase(${metric}[${w}]))`
          ),
          /* 4 - by HTTP method */ prometheus.queryInstant(
            `sum by(http_method) (increase(${metric}[${w}]))`
          ),
          /* 5 - per-region */ prometheus.queryInstant(
            `sum by(label_topology_kubernetes_io_region, coraza_outcome) (increase(${metric}[${w}]))`
          ),
        ];

        if (!edgeName) {
          queries.push(
            /* 6 - per-edge */ prometheus.queryInstant(
              `sum by(gateway_name, coraza_outcome) (increase(${metric}[${w}]))`
            )
          );
        }

        const results = await Promise.allSettled(queries);

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
        const round = (n: number) => Math.round(n);

        // --- By outcome ---
        const byOutcome: Record<string, number> = {};
        let totalEvents = 0;
        for (const r of parseInstant(results[0])) {
          const outcome = r.metric?.coraza_outcome;
          const val = parseVal(r);
          if (outcome && Number.isFinite(val) && val > 0) {
            byOutcome[outcome] = round(val);
            totalEvents += round(val);
          }
        }

        // --- By severity ---
        const bySeverity: Record<string, number> = {};
        for (const r of parseInstant(results[1])) {
          const severity = r.metric?.coraza_rule_severity;
          const val = parseVal(r);
          if (severity && Number.isFinite(val) && val > 0) bySeverity[severity] = round(val);
        }

        // --- Top rules ---
        const topRules = parseInstant(results[2])
          .map((r) => {
            const val = parseVal(r);
            if (!Number.isFinite(val) || val <= 0) return null;
            return {
              ruleId: r.metric?.coraza_rule_id ?? '',
              severity: r.metric?.coraza_rule_severity ?? '',
              action: r.metric?.coraza_rule_action ?? '',
              events: round(val),
            };
          })
          .filter(Boolean)
          .sort((a, b) => b!.events - a!.events);

        // --- By TTP mode ---
        const byMode: Record<string, number> = {};
        for (const r of parseInstant(results[3])) {
          const mode = r.metric?.trafficprotectionpolicy_mode;
          const val = parseVal(r);
          if (mode && Number.isFinite(val) && val > 0) byMode[mode] = round(val);
        }

        // --- By HTTP method ---
        const byMethod: Record<string, number> = {};
        for (const r of parseInstant(results[4])) {
          const method = r.metric?.http_method;
          const val = parseVal(r);
          if (method && Number.isFinite(val) && val > 0) byMethod[method] = round(val);
        }

        // --- Per-region ---
        const regionMap: Record<string, Record<string, number>> = {};
        for (const r of parseInstant(results[5])) {
          const region = r.metric?.label_topology_kubernetes_io_region;
          const outcome = r.metric?.coraza_outcome ?? 'unknown';
          const val = parseVal(r);
          if (region && Number.isFinite(val) && val > 0) {
            regionMap[region] ??= {};
            regionMap[region][outcome] = round(val);
          }
        }
        const perRegion = Object.entries(regionMap).map(([region, outcomes]) => ({
          region,
          ...outcomes,
          total: Object.values(outcomes).reduce((s, v) => s + v, 0),
        }));

        // --- Per-edge (project-wide only) ---
        let perEdge:
          | Array<{ edgeName: string; total: number; outcomes: Record<string, number> }>
          | undefined;
        if (!edgeName) {
          const edgeMap: Record<string, Record<string, number>> = {};
          for (const r of parseInstant(results[6])) {
            const name = r.metric?.gateway_name;
            const outcome = r.metric?.coraza_outcome ?? 'unknown';
            const val = parseVal(r);
            if (name && Number.isFinite(val) && val > 0) {
              edgeMap[name] ??= {};
              edgeMap[name][outcome] = round(val);
            }
          }
          const edges = Object.entries(edgeMap).map(([name, outcomes]) => ({
            edgeName: name,
            outcomes,
            total: Object.values(outcomes).reduce((s, v) => s + v, 0),
          }));
          if (edges.length > 0) perEdge = edges;
        }

        return {
          windowMinutes,
          ...(edgeName ? { edgeName } : {}),
          totalEvents,
          byOutcome: Object.keys(byOutcome).length > 0 ? byOutcome : undefined,
          bySeverity: Object.keys(bySeverity).length > 0 ? bySeverity : undefined,
          topRules: topRules.length > 0 ? topRules : undefined,
          byMode: Object.keys(byMode).length > 0 ? byMode : undefined,
          byMethod: Object.keys(byMethod).length > 0 ? byMethod : undefined,
          perRegion: perRegion.length > 0 ? perRegion : undefined,
          perEdge,
          note:
            totalEvents === 0
              ? 'No WAF events detected in the selected window — either traffic protection is not enabled, or no rule events were triggered.'
              : undefined,
        };
      },
    }),

    queryPrometheus: tool({
      description:
        'Run an arbitrary PromQL instant query against the project-scoped Prometheus.' +
        ' Use as a fallback when getProjectMetrics or getTrafficProtectionMetrics do not cover the question.' +
        ' The query MUST contain the project filter label.' +
        ' Returns raw metric results (labels + values), capped at 50 series.',
      inputSchema: z.object({
        projectId: z.string().describe('The project k8s name'),
        query: z.string().describe('The PromQL instant query to execute'),
        description: z
          .string()
          .describe('A brief explanation of what this query measures (for audit logging)'),
      }),
      execute: async ({
        projectId,
        query,
        description: _description,
      }: {
        projectId: string;
        query: string;
        description: string;
      }) => {
        if (!env.server.prometheusUrl || !accessToken) {
          return { error: 'Metrics are not available' };
        }

        const expectedFilter = `resourcemanager_datumapis_com_project_name="${projectId}"`;
        if (!query.includes(expectedFilter)) {
          return {
            error: `Query must contain the project filter: ${expectedFilter}`,
          };
        }

        const prometheus = new PrometheusService({
          baseURL: env.server.prometheusUrl,
          timeout: 15000,
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        try {
          const response = await prometheus.queryInstant(query);
          type ResultEntry = { metric: Record<string, string>; value?: [number, string] };
          const results =
            (
              response as {
                data?: { result?: ResultEntry[] };
              }
            )?.data?.result ?? [];

          return {
            resultCount: results.length,
            results: results.slice(0, 50).map((r) => ({
              labels: r.metric,
              value: r.value?.[1] ?? null,
            })),
            truncated: results.length > 50,
          };
        } catch (error) {
          return {
            error: `Prometheus query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),
  };
}
