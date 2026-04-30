import {
  buildPrometheusLabelSelector,
  createRegionFilter,
  useMetrics,
  usePrometheusAPIQuery,
} from '@/modules/metrics';
import { formatDurationFromMs, parseDurationToMs } from '@/modules/metrics/utils/date-parsers';
import type { FormattedMetricData } from '@/modules/prometheus';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { useMemo } from 'react';

interface HttpProxyWafTopRulesProps {
  projectId: string;
  proxyId: string;
}

const OWASP_RULE_NAMES: Record<string, string> = {
  '949110': 'Inbound Anomaly Score Exceeded',
  '949111': 'Inbound Anomaly Score Exceeded (Early Blocking)',
  '959100': 'Outbound Anomaly Score Exceeded',
  '941100': 'XSS Attack via libinjection',
  '941110': 'XSS: Script Tag',
  '941160': 'XSS: JavaScript URI',
  '942100': 'SQL Injection via libinjection',
  '942151': 'SQL Injection',
  '942200': 'SQL Injection: MySQL Comment',
  '942260': 'SQL Injection: Basic Authentication Bypass',
  '942370': 'SQL Injection: Benchmark/Sleep',
  '942550': 'SQL Injection: MySQL',
  '930100': 'Path Traversal Attack',
  '930110': 'Path Traversal: Double-Encoded',
  '920350': 'Host Header is Numeric IP',
  '920440': 'URL File Extension Restricted',
  '921110': 'HTTP Request Smuggling',
  '932100': 'Remote Command Execution: Unix',
  '932110': 'Remote Command Execution: Windows',
  '932235': 'Remote Command Execution: Unix Shell',
  '933100': 'PHP Injection',
  '934100': 'Node.js Injection',
};

interface RuleRow {
  ruleId: string;
  severity: string | null;
  action: string | null;
  events: number;
}

export const HttpProxyWafTopRules = ({ projectId, proxyId }: HttpProxyWafTopRulesProps) => {
  const { buildQueryContext, refreshInterval, filterState } = useMetrics();

  const queryContext = useMemo(() => buildQueryContext(), [buildQueryContext, filterState]);

  const windowDuration = useMemo(
    () =>
      formatDurationFromMs(
        queryContext.timeRange.end.getTime() - queryContext.timeRange.start.getTime()
      ),
    [queryContext.timeRange]
  );

  const query = useMemo(() => {
    const regionFilter = createRegionFilter(queryContext.get('regions'));
    const selector = buildPrometheusLabelSelector({
      baseLabels: {
        resourcemanager_datumapis_com_project_name: projectId,
        gateway_name: proxyId,
      },
      customLabels: { label_topology_kubernetes_io_region: '!=""' },
      filters: [regionFilter],
    });
    return (
      `topk(10, sum by (coraza_rule_id, coraza_rule_severity, coraza_rule_action) (` +
      `increase(coraza_envoy_filter_request_events_total${selector}[${windowDuration}])` +
      `))`
    );
  }, [projectId, proxyId, queryContext, windowDuration]);

  const refetchMs = useMemo<number | false>(() => {
    if (refreshInterval === 'off') return false;
    return parseDurationToMs(refreshInterval) ?? false;
  }, [refreshInterval]);

  const queryKey = useMemo(
    () => [
      'waf-top-rules',
      projectId,
      proxyId,
      query,
      queryContext.timeRange.start.getTime(),
      queryContext.timeRange.end.getTime(),
    ],
    [projectId, proxyId, query, queryContext.timeRange]
  );

  const { data, isLoading, error } = usePrometheusAPIQuery<FormattedMetricData>(
    queryKey,
    { type: 'chart', query },
    { enabled: !!query, refetchInterval: refetchMs }
  );

  const rows: RuleRow[] = useMemo(() => {
    if (!data?.series?.length) return [];
    return data.series
      .map<RuleRow>((series) => ({
        ruleId: series.labels.coraza_rule_id ?? '',
        severity: series.labels.coraza_rule_severity ?? null,
        action: series.labels.coraza_rule_action ?? null,
        events: Math.round(series.data[0]?.value ?? 0),
      }))
      .filter((row) => row.ruleId !== '' && row.events > 0)
      .sort((a, b) => b.events - a.events);
  }, [data]);

  const ruleLabel = (ruleId: string): string => OWASP_RULE_NAMES[ruleId] ?? `Rule ${ruleId}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">Top Triggered Rules</p>
      {isLoading ? (
        <div className="bg-muted h-32 animate-pulse rounded-md" />
      ) : error ? (
        <p className="text-muted-foreground text-sm">Unable to load rule events.</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">No rule events in this time window.</p>
      ) : (
        <div className="scrollbar-hide overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-background sticky top-0">
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${row.ruleId}-${index}`} className="hover:bg-muted/50">
                  <TableCell>
                    <span className="text-sm">{ruleLabel(row.ruleId)}</span>
                    <span className="text-muted-foreground ml-1.5 font-mono text-xs">
                      {row.ruleId}
                    </span>
                  </TableCell>
                  <TableCell>{row.severity ?? '—'}</TableCell>
                  <TableCell>{row.action ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {row.events.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
