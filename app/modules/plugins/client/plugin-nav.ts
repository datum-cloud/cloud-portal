/**
 * Build sidebar contributions from plugins' `portal.nav/project` extensions.
 * Prefer {@link mergePluginNavIntoTree} from `@/modules/project-nav` for the
 * nested category sidebar — this helper remains for callers that only need the
 * flat contribution list.
 */
import { resolvePluginIcon } from './icon-map';
import { getNavExtensions } from './match-extension';
import type { PublicPlugin } from '@/modules/plugins/types';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import type { NavItem } from '@datum-cloud/datum-ui/app-navigation';

type OrderedNavItem = NavItem & { order: number; section?: string };

/** Join the plugin mount root with a mount-relative nav path. */
function pluginHref(projectId: string, slug: string, navPath: string): string {
  const root = getPathWithParams(paths.project.detail.services.plugin, {
    projectId,
    serviceSlug: slug,
  });
  const rel = navPath.replace(/^\/+/, '');
  return rel ? `${root}/${rel}` : root;
}

/** Nav items contributed by a single plugin. */
function navItemsForPlugin(plugin: PublicPlugin, projectId: string): OrderedNavItem[] {
  return getNavExtensions(plugin.manifest).map((nav) => ({
    title: nav.properties.title,
    href: pluginHref(projectId, plugin.slug, nav.properties.path),
    type: 'link' as const,
    icon: resolvePluginIcon(nav.properties.icon),
    order: nav.properties.order ?? Number.MAX_SAFE_INTEGER,
    section: nav.properties.section,
  }));
}

/** Flatten every ready plugin's nav extensions into a single ordered list. */
export function buildPluginNavItems(plugins: PublicPlugin[], projectId: string): OrderedNavItem[] {
  return plugins.flatMap((plugin) => navItemsForPlugin(plugin, projectId));
}
