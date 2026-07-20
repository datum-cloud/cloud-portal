/// <reference types="bun-types/test" />
import { validateManifest } from './manifest.schema';
import { describe, expect, test } from 'bun:test';

function baseManifest(overrides: Record<string, unknown> = {}) {
  return {
    name: 'compute.miloapis.com',
    version: '1.4.0',
    sdk: { name: '@datum-cloud/portal-plugin-sdk', range: '^1.0.0' },
    remoteEntry: 'remote-entry.js',
    exposedModules: {
      InstanceList: './src/pages/instance-list.tsx',
      HomeCard: './src/cards/compute-summary.tsx',
    },
    extensions: [
      {
        type: 'portal.nav/project',
        properties: {
          id: 'compute-instances',
          title: 'Instances',
          icon: 'cpu',
          path: 'instances',
          order: 30,
        },
        requirements: {
          permissions: [{ group: 'compute.miloapis.com', resource: 'instances', verb: 'list' }],
        },
      },
      {
        type: 'portal.page/project',
        properties: { path: 'instances', component: { $codeRef: 'InstanceList' } },
      },
      {
        type: 'portal.card/project-home',
        properties: { title: 'Compute', component: { $codeRef: 'HomeCard' }, order: 10 },
      },
    ],
    ...overrides,
  };
}

describe('validateManifest', () => {
  test('accepts a fully-valid manifest with all three v1 extension points', () => {
    const result = validateManifest(baseManifest());
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.manifest.name).toBe('compute.miloapis.com');
      expect(result.manifest.extensions).toHaveLength(3);
      expect(result.unknownExtensionTypes).toEqual([]);
    }
  });

  test('rejects a manifest missing required top-level fields', () => {
    const { sdk: _sdk, ...noSdk } = baseManifest();
    const result = validateManifest(noSdk);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('sdk'))).toBe(true);
    }
  });

  test('rejects a $codeRef that does not reference a declared exposedModule', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.page/project',
            properties: { path: 'ghost', component: { $codeRef: 'DoesNotExist' } },
          },
        ],
      })
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('DoesNotExist'))).toBe(true);
    }
  });

  test('resolves the module part of a "Module.exportName" $codeRef', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.page/project',
            properties: { path: 'instances', component: { $codeRef: 'InstanceList.List' } },
          },
        ],
      })
    );
    expect(result.valid).toBe(true);
  });

  test('tolerates an unknown extension type and reports it', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.nav/project',
            properties: { id: 'x', title: 'X', icon: 'cpu', path: 'x' },
          },
          {
            type: 'portal.future/thing',
            properties: { anything: true, nested: { ok: 1 } },
          },
        ],
      })
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.unknownExtensionTypes).toEqual(['portal.future/thing']);
    }
  });

  test('rejects a malformed KNOWN extension instead of treating it as unknown', () => {
    const result = validateManifest(
      baseManifest({
        // Missing required `title` and `icon` on a known nav extension.
        extensions: [{ type: 'portal.nav/project', properties: { id: 'x', path: 'x' } }],
      })
    );
    expect(result.valid).toBe(false);
  });

  test('rejects a non-object input', () => {
    expect(validateManifest(null).valid).toBe(false);
    expect(validateManifest('nope').valid).toBe(false);
    expect(validateManifest(42).valid).toBe(false);
  });
});
