import {
  STATUS_CLASS_FILTER_KEY,
  STATUS_CLASS_OPTIONS,
} from '@/features/edge/proxy/metrics/queries';
import { MetricsFilter } from '@/modules/metrics';

export function StatusClassFilter() {
  return (
    <MetricsFilter.Select
      className="w-full sm:w-auto sm:min-w-44"
      multiple
      filterKey={STATUS_CLASS_FILTER_KEY}
      placeholder="Status class"
      options={[...STATUS_CLASS_OPTIONS]}
      maxCount={2}
      emptyContent="No status classes."
    />
  );
}
