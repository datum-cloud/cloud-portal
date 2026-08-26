/**
 * Merge plugin `portal.nav/project` extensions into the nested project nav tree.
 *
 * - Known `section` → insert as a child of that host category (sorted by `order`)
 * - Missing / unknown `section` → collapsible group titled with plugin displayName
 * - `comingSoon: true` → Coming Soon until the project has an Active
 *   ServiceEntitlement for `serviceRef` (defaults to plugin slug). Destination
 *   while Coming Soon follows `comingSoonMode` (`holding` default → host page,
 *   `plugin` → mount path, `external` → roadmapUrl). Once entitled, render the
 *   live plugin mount `path` with no badge.
 * - Nested items are text-only (no icons); category / plugin-group parents keep icons
 */
import type { SectionNavItem } from './build-project-nav';
import { comingSoonHref } from './coming-soon';
import { COMING_SOON_BADGE, isProjectNavSection, type ProjectNavSection } from './types';
import { getNavExtensions } from '@/modules/plugins/client/match-extension';
import type { NavProjectProperties, PublicPlugin } from '@/modules/plugins/types';
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

export type MergePluginNavOptions = {
  /**
   * Active ServiceEntitlement service ids for the current project (canonical
   * `status.serviceName` values, e.g. `compute.datumapis.com`). Plugin nav items
   * with `comingSoon` render live when their `serviceRef` (or plugin slug) is
   * in this set.
   */
  activeServiceEntitlements?: ReadonlySet<string> | readonly string[];
};

function pluginHref(projectId: string, slug: string, navPath: string): string {
  const root = getPathWithParams(paths.project.detail.services.plugin, {
    projectId,
    serviceSlug: slug,
  });
  const rel = navPath.replace(/^\/+/, '');
  return rel ? `${root}/${rel}` : root;
}

function toEntitlementSet(
  active: MergePluginNavOptions['activeServiceEntitlements']
): ReadonlySet<string> {
  if (!active) return new Set();
  return active instanceof Set ? active : new Set(active);
}

function comingSoonModeOf(
  props: NavProjectProperties
): NonNullable<NavProjectProperties['comingSoonMode']> {
  return props.comingSoonMode ?? 'holding';
}

function comingSoonNavItem(
  projectId: string,
  plugin: PublicPlugin,
  nav: { properties: NavProjectProperties }
): OrderedNavChild {
  const props = nav.properties;
  const mode = comingSoonModeOf(props);
  const roadmapUrl = props.roadmapUrl?.trim() || undefined;
  const order = props.order ?? Number.MAX_SAFE_INTEGER;
  const base = {
    title: props.title,
    muted: true as const,
    badge: COMING_SOON_BADGE,
    order,
  };

  if (mode === 'plugin') {
    return {
      ...base,
      href: pluginHref(projectId, plugin.slug, props.path),
      type: 'link',
    };
  }

  if (mode === 'external' && roadmapUrl) {
    return {
      ...base,
      href: roadmapUrl,
      type: 'externalLink',
    };
  }

  // Default: host holding page (roadmapUrl is a CTA on that page, not the nav target).
  return {
    ...base,
    href: comingSoonHref(projectId, props.id),
    type: 'link',
  };
}

function contributionsForPlugins(
  plugins: PublicPlugin[],
  projectId: string,
  activeServices: ReadonlySet<string>
): PluginNavContribution[] {
  const out: PluginNavContribution[] = [];

  for (const plugin of plugins) {
    for (const nav of getNavExtensions(plugin.manifest)) {
      const sectionRaw = nav.properties.section;
      const section = isProjectNavSection(sectionRaw) ? sectionRaw : undefined;
      const serviceRef = nav.properties.serviceRef?.trim() || plugin.slug;
      const entitled = activeServices.has(serviceRef);
      // Soft-launch: Coming Soon until entitled; live path once Active.
      const showComingSoon = nav.properties.comingSoon === true && !entitled;

      out.push({
        plugin,
        section,
        // Nested under a category or plugin group — text-only (no child icons).
        item: showComingSoon
          ? comingSoonNavItem(projectId, plugin, nav)
          : {
              title: nav.properties.title,
              href: pluginHref(projectId, plugin.slug, nav.properties.path),
              type: 'link',
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
    type: 'collapsible',
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
  projectId: string,
  options: MergePluginNavOptions = {}
): NavItem[] {
  const tree: SectionNavItem[] = builtInTree.map((item) => ({
    ...item,
    children: item.children ? [...item.children] : undefined,
  }));
  const activeServices = toEntitlementSet(options.activeServiceEntitlements);

  for (const { plugin, section, item } of contributionsForPlugins(
    plugins,
    projectId,
    activeServices
  )) {
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
