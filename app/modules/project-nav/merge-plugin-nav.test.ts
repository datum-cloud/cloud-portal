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
    // Built-in orders: Activity 10, Metrics Export 20, Usage 30 — plugin at 25 slots between.
    expect(titles.indexOf('Metrics Export')).toBeLessThan(titles.indexOf('Platform data'));
    expect(titles.indexOf('Platform data')).toBeLessThan(titles.indexOf('Usage'));
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
    expect(group?.type).toBe('group');
    expect(group?.children?.some((c) => c.title === 'Home page')).toBe(true);
  });

  test('planned items are external links with Coming Soon badges', () => {
    const tree = buildProjectNavTree('proj-1');
    const build = tree.find((item) => item.sectionId === 'build');
    const compute = build?.children?.find((c) => c.title === 'Compute');
    expect(compute?.type).toBe('externalLink');
    expect(compute?.badge?.label).toBe('Coming Soon');
    expect(compute?.href).toMatch(/^https:\/\//);
  });
});
