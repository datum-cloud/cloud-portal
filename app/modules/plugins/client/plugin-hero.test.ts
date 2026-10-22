import { pickHomeHero } from './plugin-hero';
import type { PluginExtension, PublicPlugin } from '@/modules/plugins/types';
import {
  EXTENSION_COLUMN_PROJECT_HOME,
  EXTENSION_HERO_PROJECT_HOME,
} from '@/modules/plugins/types';
import { describe, expect, test } from 'vitest';

function hero(title: string, extra: { order?: number; serviceRef?: string } = {}) {
  return {
    type: EXTENSION_HERO_PROJECT_HOME,
    properties: { title, component: { $codeRef: title }, order: extra.order },
    requirements: extra.serviceRef ? { serviceRef: extra.serviceRef } : undefined,
  } satisfies PluginExtension;
}

function plugin(slug: string, extensions: PluginExtension[]): PublicPlugin {
  return {
    slug,
    displayName: slug,
    deprecated: false,
    devMode: true,
    source: 'static',
    manifest: {
      name: `${slug}.datumapis.com`,
      version: '1.0.0',
      remoteEntry: 'remoteEntry.js',
      exposedModules: {},
      extensions,
    },
  };
}

describe('pickHomeHero', () => {
  test('returns nothing when no plugin declares a hero', () => {
    const columns = plugin('compute', [
      {
        type: EXTENSION_COLUMN_PROJECT_HOME,
        properties: { title: 'Workloads', component: { $codeRef: 'Workloads' } },
      },
    ]);
    expect(pickHomeHero([columns], new Set())).toBeUndefined();
  });

  test('picks the first plugin hero, then the lowest order within it', () => {
    const picked = pickHomeHero(
      [
        plugin('network', [hero('Later', { order: 2 }), hero('First', { order: 1 })]),
        plugin('compute', [hero('Other plugin', { order: 0 })]),
      ],
      new Set()
    );
    expect(picked?.plugin.slug).toBe('network');
    expect(picked?.hero.properties.title).toBe('First');
    expect(picked?.pluginRef).toEqual({
      remoteName: 'network.datumapis.com',
      slug: 'network',
      remoteEntry: 'remoteEntry.js',
    });
  });

  test('skips a serviceRef-gated hero until the project is entitled', () => {
    const plugins = [
      plugin('network', [hero('Gated', { serviceRef: 'networking.datumapis.com' })]),
      plugin('compute', [hero('Fallback')]),
    ];
    expect(pickHomeHero(plugins, new Set())?.hero.properties.title).toBe('Fallback');
    expect(
      pickHomeHero(plugins, new Set(['networking.datumapis.com']))?.hero.properties.title
    ).toBe('Gated');
  });
});
