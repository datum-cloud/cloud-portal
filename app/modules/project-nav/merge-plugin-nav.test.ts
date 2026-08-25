import { buildProjectNavTree } from './build-project-nav';
import { mergePluginNavIntoTree } from './merge-plugin-nav';
import type { PublicPlugin } from '@/modules/plugins/types';
import { EXTENSION_NAV_PROJECT } from '@/modules/plugins/types';
import { describe, expect, test } from 'bun:test';

function plugin(partial: {
  slug: string;
  displayName: string;
  nav: Array<{
    id: string;
    title: string;
    path: string;
    section?: 'deliver' | 'build' | 'connect' | 'observe' | 'settings';
    order?: number;
    comingSoon?: boolean;
    roadmapUrl?: string;
  }>;
}): PublicPlugin {
  return {
    slug: partial.slug,
    displayName: partial.displayName,
    deprecated: false,
    devMode: true,
    source: 'static',
    manifest: {
      name: partial.slug,
      version: '1.0.0',
      remoteEntry: 'remoteEntry.js',
      exposedModules: {},
      extensions: partial.nav.map((nav) => ({
        type: EXTENSION_NAV_PROJECT,
        properties: {
          id: nav.id,
          title: nav.title,
          icon: 'puzzle',
          path: nav.path,
          section: nav.section,
          order: nav.order,
          comingSoon: nav.comingSoon,
          roadmapUrl: nav.roadmapUrl,
        },
      })),
    },
  };
}

describe('mergePluginNavIntoTree', () => {
  test('nests items with a known section under that category', () => {
    const tree = buildProjectNavTree('proj-1');
    const merged = mergePluginNavIntoTree(
      tree,
      [
        plugin({
          slug: 'sample',
          displayName: 'Sample',
          nav: [
            { id: 'a', title: 'Platform data', path: 'platform', section: 'observe', order: 25 },
          ],
        }),
      ],
      'proj-1'
    );

    const observe = merged.find((item) => item.title === 'Observe');
    const titles = observe?.children?.map((c) => c.title) ?? [];
    expect(titles).toContain('Platform data');
    // Built-in orders: Activity 10, Metrics Export 20 — plugin at 25 slots after.
    expect(titles.indexOf('Metrics Export')).toBeLessThan(titles.indexOf('Platform data'));
    expect(titles.at(-1)).toBe('Platform data');
    expect(merged.some((item) => item.title === 'Sample')).toBe(false);
  });

  test('creates a per-plugin collapsible group when section is omitted', () => {
    const tree = buildProjectNavTree('proj-1');
    const merged = mergePluginNavIntoTree(
      tree,
      [
        plugin({
          slug: 'sample',
          displayName: 'Sample Plugin',
          nav: [{ id: 'home', title: 'Home page', path: 'home', order: 10 }],
        }),
      ],
      'proj-1'
    );

    const group = merged.find((item) => item.title === 'Sample Plugin');
    expect(group?.type).toBe('collapsible');
    expect(group?.children?.some((c) => c.title === 'Home page')).toBe(true);
    expect(group?.children?.find((c) => c.title === 'Home page')?.icon).toBeUndefined();
  });

  test('planned items are external links with Coming Soon badges', () => {
    const tree = buildProjectNavTree('proj-1');
    const build = tree.find((item) => item.sectionId === 'build');
    expect(build?.type).toBe('collapsible');
    // Compute is plugin-owned; host Build placeholders start at Object Storage.
    const objectStorage = build?.children?.find((c) => c.title === 'Object Storage');
    expect(objectStorage?.type).toBe('externalLink');
    expect(objectStorage?.badge?.label).toBe('Coming Soon');
    expect(objectStorage?.href).toMatch(/^https:\/\//);
    expect(objectStorage?.icon).toBeUndefined();
    expect(build?.children?.some((c) => c.title === 'Compute')).toBe(false);
  });

  test('built-in category children omit icons', () => {
    const tree = buildProjectNavTree('proj-1');
    const deliver = tree.find((item) => item.sectionId === 'deliver');
    expect(deliver?.type).toBe('collapsible');
    expect(deliver?.icon).toBeDefined();
    for (const child of deliver?.children ?? []) {
      expect(child.icon).toBeUndefined();
    }
  });

  test('plugin comingSoon items nest as external Coming Soon links', () => {
    const tree = buildProjectNavTree('proj-1');
    const roadmap = 'https://github.com/datum-cloud/enhancements/issues/1234';
    const merged = mergePluginNavIntoTree(
      tree,
      [
        plugin({
          slug: 'compute',
          displayName: 'Compute',
          nav: [
            {
              id: 'instances',
              title: 'Instances',
              path: '',
              section: 'build',
              order: 25,
              comingSoon: true,
              roadmapUrl: roadmap,
            },
          ],
        }),
      ],
      'proj-1'
    );

    const build = merged.find((item) => item.title === 'Build');
    const instances = build?.children?.find((c) => c.title === 'Instances');
    expect(instances?.type).toBe('externalLink');
    expect(instances?.badge?.label).toBe('Coming Soon');
    expect(instances?.href).toBe(roadmap);
    expect(instances?.muted).toBe(true);
    // Between Object Storage (20) and Edge Apps (30) via order 25 — Compute is
    // plugin-owned, so host Build placeholders no longer include it.
    const titles = build?.children?.map((c) => c.title) ?? [];
    expect(titles.indexOf('Object Storage')).toBeLessThan(titles.indexOf('Instances'));
    expect(titles.indexOf('Instances')).toBeLessThan(titles.indexOf('Edge Apps'));
  });
});
