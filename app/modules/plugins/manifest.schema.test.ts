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

  test('accepts a valid portal.dock/project extension', () => {
    const result = validateManifest(
      baseManifest({
        exposedModules: { ChatDock: './src/widgets/chat-dock.tsx' },
        extensions: [
          {
            type: 'portal.dock/project',
            properties: {
              id: 'assistant-chat',
              title: 'Patch AI',
              icon: 'brain',
              component: { $codeRef: 'ChatDock' },
              order: 0,
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.manifest.extensions).toHaveLength(1);
      expect(result.unknownExtensionTypes).toEqual([]);
    }
  });

  test('accepts a portal.dock/project extension without the optional order', () => {
    const result = validateManifest(
      baseManifest({
        exposedModules: { ChatDock: './src/widgets/chat-dock.tsx' },
        extensions: [
          {
            type: 'portal.dock/project',
            properties: {
              id: 'assistant-chat',
              title: 'Patch AI',
              icon: 'brain',
              component: { $codeRef: 'ChatDock' },
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(true);
  });

  test('rejects a portal.dock/project extension missing required properties', () => {
    const result = validateManifest(
      baseManifest({
        exposedModules: { ChatDock: './src/widgets/chat-dock.tsx' },
        extensions: [
          {
            type: 'portal.dock/project',
            // Missing `id` and `icon`.
            properties: { title: 'Patch AI', component: { $codeRef: 'ChatDock' } },
          },
        ],
      })
    );
    expect(result.valid).toBe(false);
  });

  test('rejects a portal.dock/project extension with a $codeRef that does not resolve', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.dock/project',
            properties: {
              id: 'assistant-chat',
              title: 'Patch AI',
              icon: 'brain',
              component: { $codeRef: 'DoesNotExist' },
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('DoesNotExist'))).toBe(true);
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

  test('accepts comingSoon nav with a roadmapUrl and live path', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.nav/project',
            properties: {
              id: 'compute',
              title: 'Compute',
              icon: 'server',
              path: 'workloads',
              section: 'build',
              comingSoon: true,
              roadmapUrl: 'https://github.com/datum-cloud/enhancements/issues/1',
              serviceRef: 'compute.datumapis.com',
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(true);
  });

  test('accepts comingSoon holding nav without roadmapUrl', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.nav/project',
            properties: {
              id: 'compute',
              title: 'Compute',
              icon: 'server',
              path: 'workloads',
              comingSoon: true,
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(true);
  });

  test('accepts comingSoon holding nav with empty path', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.nav/project',
            properties: {
              id: 'compute',
              title: 'Compute',
              icon: 'server',
              path: '',
              comingSoon: true,
              description: 'Workloads and instances.',
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(true);
  });

  test('accepts comingSoonMode plugin with a path', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.nav/project',
            properties: {
              id: 'compute',
              title: 'Compute',
              icon: 'server',
              path: 'workloads',
              comingSoon: true,
              comingSoonMode: 'plugin',
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(true);
  });

  test('accepts comingSoonMode plugin with empty path (plugin index)', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.nav/project',
            properties: {
              id: 'compute',
              title: 'Compute',
              icon: 'server',
              path: '',
              comingSoon: true,
              comingSoonMode: 'plugin',
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(true);
  });

  test('accepts live nav with empty path (plugin index)', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.nav/project',
            properties: {
              id: 'compute',
              title: 'Compute',
              icon: 'server',
              path: '',
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(true);
  });

  test('rejects comingSoonMode external without roadmapUrl', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.nav/project',
            properties: {
              id: 'compute',
              title: 'Compute',
              icon: 'server',
              path: 'workloads',
              comingSoon: true,
              comingSoonMode: 'external',
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(false);
  });

  test('rejects comingSoonMode without comingSoon', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.nav/project',
            properties: {
              id: 'compute',
              title: 'Compute',
              icon: 'server',
              path: 'workloads',
              comingSoonMode: 'plugin',
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(false);
  });

  test('rejects live nav with a whitespace-only path', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.nav/project',
            properties: {
              id: 'compute-instances',
              title: 'Instances',
              icon: 'cpu',
              path: '   ',
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(false);
  });

  test('rejects comingSoonMode plugin with a whitespace-only path', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.nav/project',
            properties: {
              id: 'compute',
              title: 'Compute',
              icon: 'server',
              path: ' ',
              comingSoon: true,
              comingSoonMode: 'plugin',
            },
          },
        ],
      })
    );
    expect(result.valid).toBe(false);
  });

  test('accepts a portal.page/project extension with empty path (plugin index)', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.page/project',
            properties: { path: '', component: { $codeRef: 'InstanceList' } },
          },
        ],
      })
    );
    expect(result.valid).toBe(true);
  });

  test('rejects a portal.page/project extension with a whitespace-only path', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.page/project',
            properties: { path: '   ', component: { $codeRef: 'InstanceList' } },
          },
        ],
      })
    );
    expect(result.valid).toBe(false);
  });

  test('accepts a portal.card/project-home extension gated by requirements.serviceRef', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.card/project-home',
            properties: { title: 'Compute', component: { $codeRef: 'HomeCard' }, order: 10 },
            requirements: { serviceRef: 'compute.datumapis.com' },
          },
        ],
      })
    );
    expect(result.valid).toBe(true);
  });

  test('rejects requirements.serviceRef when empty', () => {
    const result = validateManifest(
      baseManifest({
        extensions: [
          {
            type: 'portal.card/project-home',
            properties: { title: 'Compute', component: { $codeRef: 'HomeCard' }, order: 10 },
            requirements: { serviceRef: '' },
          },
        ],
      })
    );
    expect(result.valid).toBe(false);
  });

  function navWithChildren(children: unknown) {
    return baseManifest({
      exposedModules: {},
      extensions: [
        {
          type: 'portal.nav/project',
          properties: {
            id: 'compute',
            title: 'Compute',
            icon: 'server',
            path: '/',
            section: 'build',
            children,
          },
        },
      ],
    });
  }

  test('keeps nested portal.nav/project children through validation', () => {
    const children = [
      { title: 'Workloads', path: '' },
      { title: 'Advanced', order: 20, children: [{ title: 'Quotas', path: 'advanced/quotas' }] },
    ];
    const result = validateManifest(navWithChildren(children));
    expect(result.valid).toBe(true);
    if (result.valid) {
      const nav = result.manifest.extensions[0] as { properties: { children?: unknown } };
      expect(nav.properties.children).toEqual(children);
    }
  });

  test('rejects a nav child with neither a path nor children', () => {
    expect(validateManifest(navWithChildren([{ title: 'Workloads' }])).valid).toBe(false);
  });

  test('rejects a nav child with a whitespace-only path', () => {
    expect(validateManifest(navWithChildren([{ title: 'Workloads', path: '  ' }])).valid).toBe(
      false
    );
  });

  test('rejects a nested nav child with an empty title', () => {
    const result = validateManifest(
      navWithChildren([{ title: 'Advanced', children: [{ title: '', path: 'x' }] }])
    );
    expect(result.valid).toBe(false);
  });

  test('rejects a non-object input', () => {
    expect(validateManifest(null).valid).toBe(false);
    expect(validateManifest('nope').valid).toBe(false);
    expect(validateManifest(42).valid).toBe(false);
  });
});
