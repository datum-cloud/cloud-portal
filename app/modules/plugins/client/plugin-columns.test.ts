import { collectHomeColumns } from './plugin-columns';
import type { PluginExtension, PublicPlugin } from '@/modules/plugins/types';
import {
  EXTENSION_CARD_PROJECT_HOME,
  EXTENSION_COLUMN_PROJECT_HOME,
} from '@/modules/plugins/types';
import { describe, expect, test } from 'bun:test';

function column(title: string, extra: { order?: number; serviceRef?: string } = {}) {
  return {
    type: EXTENSION_COLUMN_PROJECT_HOME,
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

const titles = (columns: ReturnType<typeof collectHomeColumns>) =>
  columns.map((c) => c.column.properties.title);

describe('collectHomeColumns', () => {
  test('returns nothing when no plugin declares a column', () => {
    const cards = plugin('compute', [
      {
        type: EXTENSION_CARD_PROJECT_HOME,
        properties: { title: 'Card', component: { $codeRef: 'Card' } },
      },
    ]);
    expect(collectHomeColumns([cards], new Set())).toEqual([]);
  });

  test('renders a column without serviceRef for a project that is not entitled', () => {
    const columns = collectHomeColumns([plugin('compute', [column('Workloads')])], new Set());
    expect(titles(columns)).toEqual(['Workloads']);
  });

  test('skips a serviceRef-gated column until the project is entitled', () => {
    const plugins = [
      plugin('compute', [column('Workloads', { serviceRef: 'compute.datumapis.com' })]),
    ];
    expect(collectHomeColumns(plugins, new Set())).toEqual([]);
    expect(titles(collectHomeColumns(plugins, new Set(['compute.datumapis.com'])))).toEqual([
      'Workloads',
    ]);
  });

  test('keeps plugin order, then each plugin orders its own columns', () => {
    const columns = collectHomeColumns(
      [
        plugin('compute', [column('Instances', { order: 2 }), column('Workloads', { order: 1 })]),
        plugin('storage', [column('Buckets')]),
      ],
      new Set()
    );
    expect(titles(columns)).toEqual(['Workloads', 'Instances', 'Buckets']);
  });

  test('carries the remote ref the lazy loader needs', () => {
    const [first] = collectHomeColumns([plugin('compute', [column('Workloads')])], new Set());
    expect(first.pluginRef).toEqual({
      remoteName: 'compute.datumapis.com',
      slug: 'compute',
      remoteEntry: 'remoteEntry.js',
    });
  });
});
