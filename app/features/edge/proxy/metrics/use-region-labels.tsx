import {
  buildLocationIndex,
  locationMatchKeys,
  resolveRegionPlace,
} from '@/features/edge/proxy/overview/enrich-active-pops';
import { usePermission } from '@/modules/rbac';
import { useLocations } from '@/resources/locations';
import { useCallback, useMemo, type ReactNode } from 'react';

/**
 * Maps Prometheus region codes (series names) onto Location city/country so the
 * regional charts can say "Dallas, United States" instead of "us-central-1".
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

  /** Legend labels keyed by every code a location might surface as. */
  const legendLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const location of locations) {
      const rawKeys = [location.name, location.region, location.locationLabel].filter(
        (key): key is string => !!key?.trim()
      );
      for (const key of [...rawKeys, ...locationMatchKeys(location)]) {
        const place = resolveRegionPlace(key, index);
        if (place) labels[key] = place;
      }
    }
    return labels;
  }, [locations, index]);

  const formatName = useCallback(
    (name: string): ReactNode => {
      const place = resolveRegionPlace(name, index);
      if (!place) return name;
      return (
        <span className="inline-flex min-w-0 items-baseline gap-1.5">
          <span className="text-foreground truncate">{place}</span>
          <span className="text-muted-foreground/70 shrink-0 text-[11px]">{name}</span>
        </span>
      );
    },
    [index]
  );

  return { legendLabels, formatName };
}
