import {
  albWafTopRulesQuery,
  scopeFromContext,
  windowDuration,
} from '@/features/edge/proxy/metrics/queries';
import { useMetrics, usePrometheusChart } from '@/modules/metrics';
import type { ChartSeries } from '@/modules/prometheus';
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
  '200002': 'Failed to parse request body',
  '920180': 'POST without Content-Length or Transfer-Encoding',
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
  '941100': 'XSS Attack via libinjection',
  '941110': 'XSS: Script Tag',
  '941160': 'XSS: JavaScript URI',
  '942100': 'SQL Injection via libinjection',
  '942151': 'SQL Injection',
  '942200': 'SQL Injection: MySQL Comment',
  '942260': 'SQL Injection: Basic Authentication Bypass',
  '942370': 'SQL Injection: Benchmark/Sleep',
  '942550': 'SQL Injection: MySQL',
  '949110': 'Inbound Anomaly Score Exceeded',
  '949111': 'Inbound Anomaly Score Exceeded (Early Blocking)',
  '959100': 'Outbound Anomaly Score Exceeded',
};

interface RuleSlice {
  ruleId: string;
  file: string | null;
  phase: string | null;
  severity: string | null;
  action: string | null;
  version: string | null;
  events: number;
}

interface RuleRow {
  ruleId: string;
  name: string;
  category: string | null;
  phases: string[];
  severities: string[];
  actions: string[];
  version: string | null;
  events: number;
  share: number;
}

function lastPositiveValue(series: ChartSeries): number {
  for (let i = series.data.length - 1; i >= 0; i--) {
    const value = series.data[i]?.value;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

function cleanLabel(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function titleCaseWords(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function categoryFromFile(file: string | null): string | null {
  if (!file) return null;
  if (file.includes('recommended')) return 'Recommended';
  const match = file.match(/(?:REQUEST|RESPONSE)-\d+-([A-Z0-9-]+)/i);
  if (!match?.[1]) {
    return titleCaseWords(
      file
        .replace(/^@/, '')
        .replace(/\.conf$/i, '')
        .replace(/[_/]+/g, ' ')
    );
  }
  return titleCaseWords(match[1].replace(/^APPLICATION-ATTACK-/, ''));
}

function formatPhase(phase: string): string {
  return titleCaseWords(phase);
}

function uniqueSorted(values: Array<string | null>, eventsByValue: Map<string, number>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort(
    (a, b) => (eventsByValue.get(b) ?? 0) - (eventsByValue.get(a) ?? 0)
  );
}

function mergeRuleRows(slices: RuleSlice[]): RuleRow[] {
  const byRule = new Map<string, RuleSlice[]>();
  for (const slice of slices) {
    const group = byRule.get(slice.ruleId) ?? [];
    group.push(slice);
    byRule.set(slice.ruleId, group);
  }

  const rows = [...byRule.entries()].map(([ruleId, group]) => {
    const events = group.reduce((sum, slice) => sum + slice.events, 0);
    const count = (key: keyof Pick<RuleSlice, 'phase' | 'severity' | 'action'>) => {
      const totals = new Map<string, number>();
      for (const slice of group) {
        const value = slice[key];
        if (!value) continue;
        totals.set(value, (totals.get(value) ?? 0) + slice.events);
      }
      return totals;
    };

    return {
      ruleId,
      name: OWASP_RULE_NAMES[ruleId] ?? `Rule ${ruleId}`,
      category: categoryFromFile(group.find((slice) => slice.file)?.file ?? null),
      phases: uniqueSorted(
        group.map((slice) => slice.phase),
        count('phase')
      ).map(formatPhase),
      severities: uniqueSorted(
        group.map((slice) => slice.severity),
        count('severity')
      ),
      actions: uniqueSorted(
        group.map((slice) => slice.action),
        count('action')
      ),
      version: group.find((slice) => slice.version)?.version ?? null,
      events,
      share: 0,
    };
  });

  const total = rows.reduce((sum, row) => sum + row.events, 0);
  return rows
    .map((row) => ({ ...row, share: total > 0 ? row.events / total : 0 }))
    .sort((a, b) => b.events - a.events)
    .slice(0, 10);
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '—';
}

export const HttpProxyWafTopRules = ({ projectId, proxyId }: HttpProxyWafTopRulesProps) => {
  const { buildQueryContext, filterState } = useMetrics();

  const queryContext = useMemo(() => buildQueryContext(), [buildQueryContext, filterState]);
  const window = windowDuration(queryContext);

  const query = useMemo(
    () => albWafTopRulesQuery(scopeFromContext(queryContext, projectId, proxyId), window),
    [projectId, proxyId, queryContext, window]
  );

  const { data, isLoading, error } = usePrometheusChart({
    query,
    timeRange: queryContext.timeRange,
    step: window,
  });

  const rows = useMemo(() => {
    if (!data?.series?.length) return [];
    const slices = data.series
      .map<RuleSlice>((series) => ({
        ruleId: series.labels.coraza_rule_id ?? '',
        file: cleanLabel(series.labels.coraza_rule_file),
        phase: cleanLabel(series.labels.coraza_interruption_phase),
        severity: cleanLabel(series.labels.coraza_rule_severity),
        action: cleanLabel(series.labels.coraza_rule_action),
        version: cleanLabel(series.labels.coraza_rule_version),
        events: Math.round(lastPositiveValue(series)),
      }))
      .filter((row) => row.ruleId !== '' && row.events > 0);
    return mergeRuleRows(slices);
  }, [data]);

  const crsVersion = rows.find((row) => row.version)?.version;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Top Triggered Rules</p>
        {crsVersion ? <p className="text-muted-foreground text-xs">{crsVersion}</p> : null}
      </div>
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
                <TableHead>Category</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Events</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.ruleId} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{row.name}</span>
                      <span className="text-muted-foreground font-mono text-xs">{row.ruleId}</span>
                    </div>
                  </TableCell>
                  <TableCell>{row.category ?? '—'}</TableCell>
                  <TableCell>{formatList(row.phases)}</TableCell>
                  <TableCell>{formatList(row.severities)}</TableCell>
                  <TableCell>{formatList(row.actions)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {row.events.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {Math.round(row.share * 100)}%
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
