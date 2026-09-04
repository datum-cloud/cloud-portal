import {
  OUTCOME_LABELS,
  WAF_OUTCOME_FILTER_KEY,
  WAF_SEVERITY_FILTER_KEY,
} from '@/features/edge/proxy/metrics/queries';
import { MetricsFilter, usePrometheusLabels } from '@/modules/metrics';

const OUTCOME_OPTIONS = Object.entries(OUTCOME_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function WafOutcomeFilter() {
  return (
    <MetricsFilter.Select
      className="w-full sm:w-auto sm:min-w-40"
      multiple
      filterKey={WAF_OUTCOME_FILTER_KEY}
      placeholder="Outcome"
      options={OUTCOME_OPTIONS}
      maxCount={2}
      emptyContent="No outcomes."
    />
  );
}

export function WafSeverityFilter({ match }: { match?: string }) {
  const { options, isLoading } = usePrometheusLabels({
    label: 'coraza_rule_severity',
    match,
  });

  return (
    <MetricsFilter.Select
      className="w-full sm:w-auto sm:min-w-40"
      multiple
      filterKey={WAF_SEVERITY_FILTER_KEY}
      placeholder="Severity"
      options={options ?? []}
      disabled={isLoading}
      isLoading={isLoading}
      maxCount={2}
      emptyContent="No severities found."
    />
  );
}
