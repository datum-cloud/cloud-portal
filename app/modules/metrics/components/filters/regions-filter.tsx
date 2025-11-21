import { MetricsFilterSelect } from './base/metrics-filter-select';
import { usePrometheusLabels } from '@/modules/metrics';

export const RegionsFilter = () => {
  const { options, isLoading } = usePrometheusLabels({
    label: 'label_topology_kubernetes_io_region',
  });

  return (
    <MetricsFilterSelect
      className="min-w-56"
      multiple
      filterKey="regions"
      placeholder="Select regions..."
      options={options ?? []}
      disabled={isLoading}
      isLoading={isLoading}
      maxCount={2}
      emptyContent="No regions found."
    />
  );
};
