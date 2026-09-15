import {
  buildLocationIndex,
  resolveRegionPlace,
} from '@/features/edge/proxy/overview/enrich-active-pops';
import { usePermission } from '@/modules/rbac';
import { useLocations } from '@/resources/locations';
import { useCallback, useMemo, type ReactNode } from 'react';

const EMPTY_LEGEND_LABELS: Record<string, string> = {};

/**
 * Formats Prometheus region codes for regional charts: the code is primary,
 * with the Location country as secondary text when known.
 */
export function useRegionLabels(projectId: string) {
  const { hasPermission: canViewLocations } = usePermission('locations', 'list', {
    group: 'locations.miloapis.com',
    scope: 'project',
    projectId,
    enabled: !!projectId,
  });

  const { data: locations = [] } = useLocations(projectId, {
    enabled: !!projectId && canViewLocations,
  });

  const index = useMemo(() => buildLocationIndex(locations), [locations]);

  const formatName = useCallback(
    (name: string): ReactNode => {
      const country = resolveRegionPlace(name, index);
      if (!country) return name;
      return (
        <span className="inline-flex min-w-0 items-baseline gap-1.5">
          <span className="text-foreground truncate">{name}</span>
          <span className="text-muted-foreground/70 shrink-0 text-[11px]">{country}</span>
        </span>
      );
    },
    [index]
  );

  return { legendLabels: EMPTY_LEGEND_LABELS, formatName };
}
