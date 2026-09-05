import { formatRegionFilterOption } from '@/features/edge/proxy/overview/enrich-active-pops';
import { MetricsFilterSelect, usePrometheusLabels } from '@/modules/metrics';
import { usePermission } from '@/modules/rbac';
import { useLocations } from '@/resources/locations';
import { useMemo } from 'react';

export function HttpProxyRegionsFilter({
  projectId,
  match,
}: {
  projectId: string;
  match?: string;
}) {
  const { hasPermission: canViewLocations } = usePermission('locations', 'list', {
    group: 'locations.miloapis.com',
    scope: 'project',
    projectId,
    enabled: !!projectId,
  });

  const { data: locations = [] } = useLocations(projectId, {
    enabled: !!projectId && canViewLocations,
  });

  const { options, isLoading } = usePrometheusLabels({
    label: 'label_topology_kubernetes_io_region',
    match,
  });

  const labeledOptions = useMemo(
    () => options.map((option) => formatRegionFilterOption(option.value, locations)),
    [options, locations]
  );

  return (
    <MetricsFilterSelect
      className="w-full sm:w-auto sm:min-w-64"
      multiple
      filterKey="regions"
      placeholder="Select regions..."
      options={labeledOptions}
      disabled={isLoading}
      isLoading={isLoading}
      maxCount={2}
      emptyContent="No regions found."
    />
  );
}
