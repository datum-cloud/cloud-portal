import { toLocation } from './location.adapter';
import type { Location } from './location.schema';
import { locationKeys } from './location.service';
import type { ComMiloapisLocationsV1Alpha1Location } from '@/modules/control-plane/locations';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch project Locations for real-time projection.
 *
 * Locations are cluster-scoped in the project control plane — do not pass
 * a namespace or the watch hits `/namespaces/default/locations` and 404s.
 *
 * An ADDED event that lands right after subscribe (new entitlement
 * projecting PoPs) updates the cache like any other.
 */
export function useLocationsWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Location>({
    resourceType: 'apis/locations.miloapis.com/v1alpha1/locations',
    projectId,
    queryKey: locationKeys.list(projectId),
    transform: (item) => toLocation(item as ComMiloapisLocationsV1Alpha1Location),
    enabled: (options?.enabled ?? true) && !!projectId,
    getItemKey: (location) => location.name,
    updateListCache: (oldData, newItem) => {
      const list = (oldData as Location[] | undefined) ?? [];
      const idx = list.findIndex((location) => location.name === newItem.name);
      if (idx === -1) return [...list, newItem];
      return list.map((location) => (location.name === newItem.name ? newItem : location));
    },
  });
}
