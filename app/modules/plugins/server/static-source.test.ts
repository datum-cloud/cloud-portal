/// <reference types="bun-types/test" />
import { PluginRegistry } from './registry';
import {
  composeStaticSpecs,
  parsePortalPlugins,
  parsePortalPluginsJson,
  staticPluginSpec,
  StaticSource,
} from './static-source';
import { describe, expect, mock, test } from 'bun:test';

describe('parsePortalPlugins', () => {
  test('parses a single slug=url pair', () => {
    const { entries, errors } = parsePortalPlugins('compute=http://localhost:7777');
    expect(errors).toEqual([]);
    expect(entries).toEqual([{ slug: 'compute', baseURL: 'http://localhost:7777' }]);
  });

  test('parses multiple comma-separated pairs and trims whitespace', () => {
    const { entries } = parsePortalPlugins(
      'compute=http://localhost:7777, dns=https://dns.example.com '
    );
    expect(entries).toEqual([
      { slug: 'compute', baseURL: 'http://localhost:7777' },
      { slug: 'dns', baseURL: 'https://dns.example.com' },
    ]);
  });

  test('strips a trailing slash from the base URL', () => {
    const { entries } = parsePortalPlugins('compute=http://localhost:7777/');
    expect(entries[0].baseURL).toBe('http://localhost:7777');
  });

  test('returns empty for undefined or blank input', () => {
    expect(parsePortalPlugins(undefined).entries).toEqual([]);
    expect(parsePortalPlugins('   ').entries).toEqual([]);
  });

  test('reports and skips malformed entries without a URL', () => {
    const { entries, errors } = parsePortalPlugins('compute,dns=http://localhost:8888');
    expect(entries).toEqual([{ slug: 'dns', baseURL: 'http://localhost:8888' }]);
    expect(errors.length).toBe(1);
  });

  test('reports invalid slugs and invalid URLs', () => {
    const bad = parsePortalPlugins('Bad_Slug=http://localhost:1');
    expect(bad.entries).toEqual([]);
    expect(bad.errors[0]).toContain('invalid slug');

    const badUrl = parsePortalPlugins('compute=not a url');
    expect(badUrl.entries).toEqual([]);
    expect(badUrl.errors[0]).toContain('invalid URL');
  });

  test('rejects a non-http(s) URL scheme', () => {
    const { entries, errors } = parsePortalPlugins('compute=ftp://localhost:7777');
    expect(entries).toEqual([]);
    expect(errors[0]).toContain('scheme');
  });

  test('reports duplicate slugs and keeps the first', () => {
    const { entries, errors } = parsePortalPlugins('compute=http://a:1,compute=http://b:2');
    expect(entries).toEqual([{ slug: 'compute', baseURL: 'http://a:1' }]);
    expect(errors[0]).toContain('duplicate');
  });
});

describe('staticPluginSpec', () => {
  test('synthesizes a dev spec with entitlement disabled', () => {
    const spec = staticPluginSpec({ slug: 'compute', baseURL: 'http://localhost:7777' });
    expect(spec.slug).toBe('compute');
    expect(spec.visibility.entitlement).toBe('None');
    expect(spec.suspend).toBe(false);
    expect(spec.assets.baseURL).toBe('http://localhost:7777');
    expect(spec.assets.manifestPath).toBe('/plugin-manifest.json');
  });
});

const VALID_MANIFEST = {
  name: 'compute.miloapis.com',
  version: '1.0.0',
  sdk: { name: '@datum-cloud/portal-plugin-sdk', range: '^1.0.0' },
  remoteEntry: 'remote-entry.js',
  exposedModules: { InstanceList: './src/pages/instance-list.tsx' },
  extensions: [
    {
      type: 'portal.page/project',
      properties: { path: 'instances', component: { $codeRef: 'InstanceList' } },
    },
  ],
};

describe('StaticSource', () => {
  test('seeds the registry with dev plugins from PORTAL_PLUGINS', async () => {
    const fetchImpl = mock(
      async () => new Response(JSON.stringify(VALID_MANIFEST), { status: 200 })
    );
    const registry = new PluginRegistry({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const source = new StaticSource(registry, {
      raw: 'compute=http://localhost:7777',
      refreshIntervalMs: 0,
      logger: { warn: mock(() => {}), info: mock(() => {}) },
    });

    await source.start();

    const plugin = registry.getPlugin('compute');
    expect(plugin).toBeDefined();
    expect(plugin?.devMode).toBe(true);
    expect(plugin?.source).toBe('static');
    expect(plugin?.manifest?.name).toBe('compute.miloapis.com');
  });

  test('does not seed when PORTAL_PLUGINS is empty', async () => {
    const fetchImpl = mock(async () => new Response('{}', { status: 200 }));
    const registry = new PluginRegistry({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const source = new StaticSource(registry, {
      raw: '',
      refreshIntervalMs: 0,
      logger: { warn: mock(() => {}), info: mock(() => {}) },
    });

    await source.start();

    expect(registry.getPlugins()).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('seeds a JSON plugin with a custom manifestPath', async () => {
    const fetchImpl = mock(
      async () => new Response(JSON.stringify(VALID_MANIFEST), { status: 200 })
    );
    const registry = new PluginRegistry({ fetchImpl: fetchImpl as unknown as typeof fetch });
    const source = new StaticSource(registry, {
      rawJson: JSON.stringify([
        {
          slug: 'compute',
          assets: { baseURL: 'http://localhost:7777', manifestPath: '/custom-manifest.json' },
        },
      ]),
      refreshIntervalMs: 0,
      logger: { warn: mock(() => {}), info: mock(() => {}) },
    });

    await source.start();

    const plugin = registry.getPlugin('compute');
    expect(plugin).toBeDefined();
    expect(plugin?.devMode).toBe(true);
    expect(plugin?.spec.assets.manifestPath).toBe('/custom-manifest.json');
  });
});

describe('parsePortalPluginsJson', () => {
  test('parses a spec-shaped entry with visibility overrides', () => {
    const { specs, errors } = parsePortalPluginsJson(
      JSON.stringify([
        {
          slug: 'compute',
          displayName: 'Compute',
          assets: { baseURL: 'http://localhost:7777/' },
          visibility: { entitlement: 'Required', featureFlag: 'compute-plugin' },
        },
      ])
    );

    expect(errors).toEqual([]);
    expect(specs).toHaveLength(1);
    expect(specs[0].slug).toBe('compute');
    expect(specs[0].displayName).toBe('Compute');
    expect(specs[0].assets.baseURL).toBe('http://localhost:7777'); // trailing slash stripped
    expect(specs[0].assets.manifestPath).toBe('/plugin-manifest.json');
    expect(specs[0].visibility.entitlement).toBe('Required');
    expect(specs[0].visibility.featureFlag).toBe('compute-plugin');
  });

  test('returns empty for undefined/blank input', () => {
    expect(parsePortalPluginsJson(undefined).specs).toEqual([]);
    expect(parsePortalPluginsJson('   ').specs).toEqual([]);
  });

  test('reports invalid JSON without throwing', () => {
    const { specs, errors } = parsePortalPluginsJson('{not json');
    expect(specs).toEqual([]);
    expect(errors[0]).toContain('not valid JSON');
  });

  test('reports a schema violation (missing baseURL) and yields no specs', () => {
    const { specs, errors } = parsePortalPluginsJson(
      JSON.stringify([{ slug: 'compute', assets: {} }])
    );
    expect(specs).toEqual([]);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects an invalid slug', () => {
    const badSlug = parsePortalPluginsJson(
      JSON.stringify([{ slug: 'Bad_Slug', assets: { baseURL: 'http://x:1' } }])
    );
    expect(badSlug.specs).toEqual([]);
  });

  test('skips a duplicate slug within the JSON array', () => {
    const { specs, errors } = parsePortalPluginsJson(
      JSON.stringify([
        { slug: 'compute', assets: { baseURL: 'http://a:1' } },
        { slug: 'compute', assets: { baseURL: 'http://b:2' } },
      ])
    );
    expect(specs).toHaveLength(1);
    expect(specs[0].assets.baseURL).toBe('http://a:1');
    expect(errors[0]).toContain('duplicate');
  });
});

describe('composeStaticSpecs (precedence)', () => {
  test('JSON entries take precedence over the simple syntax on slug collision', () => {
    const { specs } = composeStaticSpecs(
      'compute=http://simple:1',
      JSON.stringify([
        {
          slug: 'compute',
          assets: { baseURL: 'http://json:2' },
          visibility: { entitlement: 'Required' },
        },
      ])
    );

    expect(specs).toHaveLength(1);
    expect(specs[0].assets.baseURL).toBe('http://json:2');
    // The JSON entry's visibility override survives (the simple entry had none).
    expect(specs[0].visibility.entitlement).toBe('Required');
  });

  test('composes non-overlapping simple and JSON entries', () => {
    const { specs } = composeStaticSpecs(
      'dns=http://dns:1',
      JSON.stringify([{ slug: 'compute', assets: { baseURL: 'http://compute:2' } }])
    );

    expect(specs.map((s) => s.slug).sort()).toEqual(['compute', 'dns']);
  });

  test('surfaces errors from both inputs prefixed by source var', () => {
    const { errors } = composeStaticSpecs('bad slug=http://x:1', '{not json');
    expect(errors.some((e) => e.startsWith('PORTAL_PLUGINS:'))).toBe(true);
    expect(errors.some((e) => e.startsWith('PORTAL_PLUGINS_JSON:'))).toBe(true);
  });
});
