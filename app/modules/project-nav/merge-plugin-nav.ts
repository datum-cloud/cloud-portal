/**
 * Merge plugin `portal.nav/project` extensions into the nested project nav tree.
 *
 * - Known `section` → insert as a child of that host category (sorted by `order`)
 * - Missing / unknown `section` → group titled with plugin displayName
 * - `comingSoon: true` → external roadmap link with Coming Soon badge (path ignored)
 */
import type { SectionNavItem } from './build-project-nav';
import { COMING_SOON_BADGE, isProjectNavSection, type ProjectNavSection } from './types';
import { resolvePluginIcon } from '@/modules/plugins/client/icon-map';
import { getNavExtensions } from '@/modules/plugins/client/match-extension';
import type { PublicPlugin } from '@/modules/plugins/types';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import type { NavItem } from '@datum-cloud/datum-ui/app-navigation';
import { PuzzleIcon } from 'lucide-react';

type OrderedNavChild = NavItem & { order: number };

type PluginGroupNavItem = SectionNavItem & { pluginSlug: string };

type PluginNavContribution = {
  plugin: PublicPlugin;
  item: OrderedNavChild;
  section?: ProjectNavSection;
};

function pluginHref(projectId: string, slug: string, navPath: string): string {
  const root = getPathWithParams(paths.project.detail.services.plugin, {
    projectId,
    serviceSlug: slug,
  });
  const rel = navPath.replace(/^\/+/, '');
  return rel ? `${root}/${rel}` : root;
}

function contributionsForPlugins(
  plugins: PublicPlugin[],
  projectId: string
): PluginNavContribution[] {
  const out: PluginNavContribution[] = [];

  for (const plugin of plugins) {
    for (const nav of getNavExtensions(plugin.manifest)) {
      const sectionRaw = nav.properties.section;
      const section = isProjectNavSection(sectionRaw) ? sectionRaw : undefined;
      const comingSoon = nav.properties.comingSoon === true && !!nav.properties.roadmapUrl;

      out.push({
        plugin,
        section,
        item: comingSoon
          ? {
              title: nav.properties.title,
              href: nav.properties.roadmapUrl!,
              type: 'externalLink',
              icon: resolvePluginIcon(nav.properties.icon),
              muted: true,
              badge: COMING_SOON_BADGE,
              order: nav.properties.order ?? Number.MAX_SAFE_INTEGER,
            }
          : {
              title: nav.properties.title,
              href: pluginHref(projectId, plugin.slug, nav.properties.path),
              type: 'link',
              icon: resolvePluginIcon(nav.properties.icon),
              order: nav.properties.order ?? Number.MAX_SAFE_INTEGER,
            },
      });
    }
  }

  return out;
}

function insertOrderedChild(parent: SectionNavItem, child: OrderedNavChild): void {
  const existing = (parent.children ?? []).map((item, index) => ({
    ...item,
    // Prefer the explicit order kept on built-ins; fall back for legacy flat items.
    order: (item as OrderedNavChild).order ?? index * 10,
  }));
  // Keep `order` until {@link stripHostMeta} so later plugin inserts stay relative.
  parent.children = [...existing, child].sort((a, b) => a.order - b.order);
}

function findSection(
  tree: SectionNavItem[],
  section: ProjectNavSection
): SectionNavItem | undefined {
  return tree.find((item) => item.sectionId === section);
}

function isPluginGroup(item: SectionNavItem): item is PluginGroupNavItem {
  return typeof (item as PluginGroupNavItem).pluginSlug === 'string';
}

function ensurePluginGroup(tree: SectionNavItem[], plugin: PublicPlugin): SectionNavItem {
  const existing = tree.find(
    (item): item is PluginGroupNavItem => isPluginGroup(item) && item.pluginSlug === plugin.slug
  );
  if (existing) return existing;

  const group: PluginGroupNavItem = {
    title: plugin.displayName || plugin.slug,
    href: null,
    type: 'group',
    icon: PuzzleIcon,
    children: [],
    pluginSlug: plugin.slug,
    showSeparatorAbove: true,
  };

  const settingsIdx = tree.findIndex((item) => item.sectionId === 'settings');
  if (settingsIdx >= 0) {
    tree.splice(settingsIdx, 0, group);
  } else {
    tree.push(group);
  }

  return group;
}

function stripChildMeta(item: NavItem): NavItem {
  const { order: _order, ...rest } = item as NavItem & { order?: number };
  return {
    ...rest,
    children: rest.children?.map(stripChildMeta),
  };
}

function stripHostMeta(item: SectionNavItem): NavItem {
  const { sectionId: _sectionId, ...rest } = item;
  const withoutSection = isPluginGroup(rest as SectionNavItem)
    ? (() => {
        const { pluginSlug: _pluginSlug, ...withoutSlug } = rest as PluginGroupNavItem;
        return withoutSlug;
      })()
    : rest;
  return stripChildMeta(withoutSection);
}

/** Returns a new nav tree with plugin contributions merged in. */
export function mergePluginNavIntoTree(
  builtInTree: SectionNavItem[],
  plugins: PublicPlugin[],
  projectId: string
): NavItem[] {
  const tree: SectionNavItem[] = builtInTree.map((item) => ({
    ...item,
    children: item.children ? [...item.children] : undefined,
  }));

  for (const { plugin, section, item } of contributionsForPlugins(plugins, projectId)) {
    if (section) {
      const parent = findSection(tree, section);
      if (parent) {
        insertOrderedChild(parent, item);
        continue;
      }
    }
    insertOrderedChild(ensurePluginGroup(tree, plugin), item);
  }

  return tree.map(stripHostMeta);
}
