/**
 * Build sidebar `NavItem`s from plugins' `portal.nav/project` extensions —
 * CLIENT-SAFE. The project-detail layout appends these after its built-in nav
 * items (see the layout's `navItems` memo).
 *
 * Icons resolve from a name (never plugin code), so the sidebar renders even if
 * a plugin's bundle is broken. Hrefs point at the plugin mount
 * (`/project/:projectId/services/<slug>/<navPath>`); navigating there loads the
 * plugin lazily under the catch-all route.
 */
import { resolvePluginIcon } from './icon-map';
import { getNavExtensions } from './match-extension';
import type { PublicPlugin } from '@/modules/plugins/types';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import type { NavItem } from '@datum-cloud/datum-ui/app-navigation';

/** Join the plugin mount root with a mount-relative nav path. */
function pluginHref(projectId: string, slug: string, navPath: string): string {
  const root = getPathWithParams(paths.project.detail.services.plugin, {
    projectId,
    serviceSlug: slug,
  });
  const rel = navPath.replace(/^\/+/, '');
  return rel ? `${root}/${rel}` : root;
}

/** Nav items contributed by a single plugin, in the plugin's declared order. */
function navItemsForPlugin(plugin: PublicPlugin, projectId: string): NavItem[] {
  return getNavExtensions(plugin.manifest).map((nav) => ({
    title: nav.properties.title,
    href: pluginHref(projectId, plugin.slug, nav.properties.path),
    type: 'link',
    icon: resolvePluginIcon(nav.properties.icon),
  }));
}

/**
 * Flatten every ready plugin's nav extensions into a single `NavItem[]` to
 * append after the host's built-in nav. The first plugin item overall gets
 * `showSeparatorAbove` so plugin nav is visually grouped apart from built-ins.
 * Plugins keep the order the registry returned them in; items within a plugin
 * are ordered by each extension's `order`.
 */
export function buildPluginNavItems(plugins: PublicPlugin[], projectId: string): NavItem[] {
  const items = plugins.flatMap((plugin) => navItemsForPlugin(plugin, projectId));
  if (items.length > 0) {
    items[0] = { ...items[0], showSeparatorAbove: true };
  }
  return items;
}
