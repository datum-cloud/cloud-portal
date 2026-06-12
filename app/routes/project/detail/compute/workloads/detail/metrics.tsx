import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import type { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Metrics</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Metrics'));

// Placeholder until a telemetry source backs CPU / memory / request metrics.
// The stat cards from the design (Avg CPU, Memory, Requests) will live here.
export default function WorkloadMetricsPage() {
  return (
    <EmptyContent
      variant="dashed"
      title="Metrics coming soon"
      subtitle="CPU, memory, and request metrics for this workload aren't available yet."
    />
  );
}
