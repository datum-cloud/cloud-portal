/**
 * Host Coming Soon holding-page helpers: URL builder + catalog lookup for
 * planned services and soft-launch plugin nav entries.
 */
import { PLANNED_SERVICES } from './planned-services';
import { getNavExtensions } from '@/modules/plugins/client/match-extension';
import type { PublicPlugin } from '@/modules/plugins/types';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

export type ComingSoonServiceInfo = {
  id: string;
  title: string;
  description?: string;
  roadmapUrl?: string;
};

/** In-app holding page for a planned / soft-launch service. */
export function comingSoonHref(projectId: string, serviceId: string): string {
  return getPathWithParams(paths.project.detail.comingSoon, { projectId, serviceId });
}

/**
 * Resolve display data for the holding page. Prefers host planned catalog,
 * then plugin `portal.nav/project` entries matched by nav `id`.
 */
export function resolveComingSoonService(
  serviceId: string,
  plugins: readonly PublicPlugin[] = []
): ComingSoonServiceInfo | undefined {
  const planned = PLANNED_SERVICES.find((service) => service.id === serviceId);
  if (planned) {
    return {
      id: planned.id,
      title: planned.title,
      description: planned.description,
      roadmapUrl: planned.roadmapUrl,
    };
  }

  for (const plugin of plugins) {
    for (const nav of getNavExtensions(plugin.manifest)) {
      if (nav.properties.id === serviceId) {
        return {
          id: nav.properties.id,
          title: nav.properties.title,
          description: nav.properties.description,
          roadmapUrl: nav.properties.roadmapUrl,
        };
      }
    }
  }

  return undefined;
}
