/**
 * Build sidebar `NavItem`s from plugins' `portal.nav/project` extensions —
 * CLIENT-SAFE. The project-detail layout merges these with its built-in nav
 * items by `order` (see the layout's `navItems` memo and `OrderedNavItem`), so
 * a plugin's declared `order` places it anywhere in the sidebar, not just
 * after every built-in item.
 *
 * Icons resolve from a name (never plugin code), so the sidebar renders even if
 * a plugin's bundle is broken. Live hrefs point at the plugin mount
 * (`/project/:projectId/services/<slug>/<navPath>`). Coming Soon items open
 * `roadmapUrl` externally instead.
 */
import { resolvePluginIcon } from './icon-map';
import { getNavExtensions } from './match-extension';
import type { PublicPlugin } from '@/modules/plugins/types';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import type { NavItem } from '@datum-cloud/datum-ui/app-navigation';

type OrderedNavItem = NavItem & { order: number };

/** Join the plugin mount root with a mount-relative nav path. */
function pluginHref(projectId: string, slug: string, navPath: string): string {
  const root = getPathWithParams(paths.project.detail.services.plugin, {
    projectId,
    serviceSlug: slug,
  });
  const rel = navPath.replace(/^\/+/, '');
  return rel ? `${root}/${rel}` : root;
}

/** Nav items contributed by a single plugin, carrying each extension's `order`
 * (missing `order` sorts last, alongside `getNavExtensions`' own default). */
function navItemsForPlugin(plugin: PublicPlugin, projectId: string): OrderedNavItem[] {
  return getNavExtensions(plugin.manifest).map((nav) => {
    const comingSoon = nav.properties.comingSoon === true && !!nav.properties.roadmapUrl;
    const order = nav.properties.order ?? Number.MAX_SAFE_INTEGER;
    const icon = resolvePluginIcon(nav.properties.icon);

    if (comingSoon) {
      return {
        title: nav.properties.title,
        href: nav.properties.roadmapUrl!,
        type: 'externalLink' as const,
        icon,
        order,
      };
    }

    return {
      title: nav.properties.title,
      href: pluginHref(projectId, plugin.slug, nav.properties.path),
      type: 'link' as const,
      icon,
      order,
    };
  });
}

/** Flatten every ready plugin's nav extensions into a single ordered list, for
 * the layout to merge with built-in nav items by `order`. */
export function buildPluginNavItems(plugins: PublicPlugin[], projectId: string): OrderedNavItem[] {
  return plugins.flatMap((plugin) => navItemsForPlugin(plugin, projectId));
}
