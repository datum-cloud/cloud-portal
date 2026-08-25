import { buildPluginNavItems } from './plugin-nav';
import type { NavProjectProperties, PublicPlugin } from '@/modules/plugins/types';
import { describe, expect, test } from 'bun:test';

function pluginWithNav(slug: string, navProps: NavProjectProperties[]): PublicPlugin {
  return {
    slug,
    displayName: slug,
    devMode: true,
    deprecated: false,
    source: 'static',
    manifest: {
      name: `${slug}.example.com`,
      version: '1.0.0',
      remoteEntry: 'remoteEntry.js',
      exposedModules: {},
      extensions: navProps.map((properties) => ({
        type: 'portal.nav/project' as const,
        properties,
      })),
    },
  };
}

describe('buildPluginNavItems', () => {
  test('builds live plugin mount links', () => {
    const items = buildPluginNavItems(
      [
        pluginWithNav('sample', [
          { id: 'home', title: 'Sample', icon: 'puzzle', path: 'home', order: 10 },
        ]),
      ],
      'proj-1'
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Sample',
      type: 'link',
      order: 10,
    });
    expect(items[0].href).toContain('/project/proj-1/services/sample/home');
  });

  test('builds Coming Soon items as external roadmap links', () => {
    const roadmap = 'https://github.com/datum-cloud/enhancements/issues/1';
    const items = buildPluginNavItems(
      [
        pluginWithNav('volumes', [
          {
            id: 'volumes',
            title: 'Volumes',
            icon: 'hard-drive',
            path: '',
            comingSoon: true,
            roadmapUrl: roadmap,
            order: 40,
          },
        ]),
      ],
      'proj-1'
    );
    expect(items).toEqual([
      expect.objectContaining({
        title: 'Volumes',
        href: roadmap,
        type: 'externalLink',
        order: 40,
      }),
    ]);
  });

  test('ignores comingSoon without roadmapUrl (treats as live path)', () => {
    const items = buildPluginNavItems(
      [
        pluginWithNav('sample', [
          {
            id: 'home',
            title: 'Sample',
            icon: 'puzzle',
            path: 'home',
            comingSoon: true,
            order: 10,
          },
        ]),
      ],
      'proj-1'
    );
    expect(items[0].type).toBe('link');
    expect(items[0].href).toContain('/services/sample/home');
  });
});
