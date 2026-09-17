import { computeWorkloadHref, findComputePluginSlug } from './compute-backend';
import type { PluginExtension, PublicPlugin } from '@/modules/plugins/types';
import { describe, expect, it } from 'bun:test';

function plugin(slug: string, name: string, extensions: PluginExtension[] = []): PublicPlugin {
  return {
    slug,
    displayName: slug,
    devMode: true,
    deprecated: false,
    source: 'static',
    manifest: {
      name,
      version: '1.0.0',
      remoteEntry: 'remote-entry.js',
      exposedModules: {},
      extensions,
    },
  };
}

describe('findComputePluginSlug', () => {
  it('returns undefined until the plugin list has loaded or when no plugin matches', () => {
    expect(findComputePluginSlug(undefined)).toBeUndefined();
    expect(findComputePluginSlug([plugin('dns', 'dns.datumapis.com')])).toBeUndefined();
  });

  it('matches the compute plugin by manifest name regardless of mount slug', () => {
    expect(findComputePluginSlug([plugin('my-compute', 'workload.compute.datumapis.com')])).toBe(
      'my-compute'
    );
  });

  it('matches a plugin whose nav extension declares the compute serviceRef', () => {
    expect(
      findComputePluginSlug([
        plugin('workloads', 'something-else', [
          {
            type: 'portal.nav/project',
            properties: {
              id: 'compute',
              title: 'Compute',
              icon: 'server',
              path: '',
              serviceRef: 'compute.datumapis.com',
            },
          },
        ]),
      ])
    ).toBe('workloads');
  });
});

describe('computeWorkloadHref', () => {
  it('links to the workload detail page under the plugin mount', () => {
    expect(computeWorkloadHref('proj-1', 'workloads', 'storefront')).toBe(
      '/project/proj-1/services/workloads/storefront'
    );
  });
});
