import { parseCodeRef, pickCodeRefExport } from './code-ref';
import {
  getCardExtensions,
  getNavExtensions,
  getPageExtensions,
  matchPluginPage,
  normalizePagePath,
  type ClientPluginManifest,
} from './match-extension';
import {
  EXTENSION_CARD_PROJECT_HOME,
  EXTENSION_NAV_PROJECT,
  EXTENSION_PAGE_PROJECT,
  type PageProjectExtension,
  type PluginExtension,
} from '@/modules/plugins/types';
import { describe, expect, it } from 'bun:test';

function pageExt(path: string, codeRef = 'Comp'): PageProjectExtension {
  return {
    type: EXTENSION_PAGE_PROJECT,
    properties: { path, component: { $codeRef: codeRef } },
  };
}

function manifest(extensions: PluginExtension[]): ClientPluginManifest {
  return {
    name: 'compute.miloapis.com',
    version: '1.4.0',
    remoteEntry: 'remote-entry.js',
    exposedModules: {},
    extensions,
  };
}

/** Build the flat page-extension list the matcher consumes. */
function pages(...paths: string[]): PageProjectExtension[] {
  return getPageExtensions(manifest(paths.map((p) => pageExt(p))));
}

describe('getPageExtensions', () => {
  it('returns only portal.page/project extensions', () => {
    const m = manifest([
      pageExt('instances'),
      {
        type: EXTENSION_NAV_PROJECT,
        properties: { id: 'x', title: 'X', icon: 'cpu', path: 'instances' },
      },
      {
        type: EXTENSION_CARD_PROJECT_HOME,
        properties: { title: 'Card', component: { $codeRef: 'Card' } },
      },
    ]);
    const result = getPageExtensions(m);
    expect(result).toHaveLength(1);
    expect(result[0].properties.path).toBe('instances');
  });
});

describe('matchPluginPage', () => {
  it('matches a static single-segment path', () => {
    const match = matchPluginPage(pages('instances'), 'instances');
    expect(match).not.toBeNull();
    expect(match?.page.properties.path).toBe('instances');
    expect(match?.params).toEqual({});
  });

  it('extracts a single :param', () => {
    const match = matchPluginPage(pages('instances/:instanceName'), 'instances/web-1');
    expect(match?.page.properties.path).toBe('instances/:instanceName');
    expect(match?.params.instanceName).toBe('web-1');
  });

  it('extracts multiple :params across nested segments', () => {
    const match = matchPluginPage(
      pages('instances/:instanceName/disks/:diskId'),
      'instances/web-1/disks/d-42'
    );
    expect(match?.params.instanceName).toBe('web-1');
    expect(match?.params.diskId).toBe('d-42');
  });

  it('prefers the most-specific (static) match over a param match', () => {
    // Both could match "instances/new"; the static route must win.
    const match = matchPluginPage(
      pages('instances/:instanceName', 'instances/new'),
      'instances/new'
    );
    expect(match?.page.properties.path).toBe('instances/new');
    expect(match?.params).toEqual({});
  });

  it('is insensitive to page declaration order for specificity', () => {
    const match = matchPluginPage(
      pages('instances/new', 'instances/:instanceName'),
      'instances/new'
    );
    expect(match?.page.properties.path).toBe('instances/new');
  });

  it('does not let a shallow route swallow a deeper path', () => {
    // "instances" must not match "instances/web-1".
    const match = matchPluginPage(pages('instances'), 'instances/web-1');
    expect(match).toBeNull();
  });

  it('does not let a deep route match a shallow path', () => {
    const match = matchPluginPage(pages('instances/:instanceName'), 'instances');
    expect(match).toBeNull();
  });

  it('matches the plugin index page for an empty splat', () => {
    const match = matchPluginPage(pages('', 'instances'), '');
    expect(match?.page.properties.path).toBe('');
  });

  it('tolerates leading/trailing slashes in both pattern and splat', () => {
    const match = matchPluginPage(pages('/instances/:id/'), '/instances/abc/');
    expect(match?.params.id).toBe('abc');
  });

  it('returns null when nothing matches', () => {
    const match = matchPluginPage(pages('instances', 'volumes'), 'networks');
    expect(match).toBeNull();
  });

  it('returns null for an empty page list', () => {
    expect(matchPluginPage([], 'anything')).toBeNull();
  });

  it('picks the longer static prefix among overlapping params', () => {
    const match = matchPluginPage(
      pages('instances/:instanceName', 'instances/:instanceName/logs'),
      'instances/web-1/logs'
    );
    expect(match?.page.properties.path).toBe('instances/:instanceName/logs');
    expect(match?.params.instanceName).toBe('web-1');
  });
});

describe('normalizePagePath', () => {
  it('strips surrounding slashes', () => {
    expect(normalizePagePath('/instances/')).toBe('instances');
  });
  it('maps a bare slash to empty (index)', () => {
    expect(normalizePagePath('/')).toBe('');
  });
});

describe('getNavExtensions', () => {
  it('returns nav extensions sorted by order then title', () => {
    const m = manifest([
      {
        type: EXTENSION_NAV_PROJECT,
        properties: { id: 'b', title: 'Beta', icon: 'cpu', path: 'b', order: 20 },
      },
      {
        type: EXTENSION_NAV_PROJECT,
        properties: { id: 'a', title: 'Alpha', icon: 'cpu', path: 'a', order: 10 },
      },
      {
        type: EXTENSION_NAV_PROJECT,
        properties: { id: 'z', title: 'Zeta', icon: 'cpu', path: 'z' },
      },
      {
        type: EXTENSION_NAV_PROJECT,
        properties: { id: 'm', title: 'Mu', icon: 'cpu', path: 'm' },
      },
    ]);
    const navs = getNavExtensions(m);
    expect(navs.map((n) => n.properties.title)).toEqual(['Alpha', 'Beta', 'Mu', 'Zeta']);
  });
});

describe('getCardExtensions', () => {
  it('returns card extensions sorted by order', () => {
    const m = manifest([
      {
        type: EXTENSION_CARD_PROJECT_HOME,
        properties: { title: 'Second', component: { $codeRef: 'B' }, order: 2 },
      },
      {
        type: EXTENSION_CARD_PROJECT_HOME,
        properties: { title: 'First', component: { $codeRef: 'A' }, order: 1 },
      },
    ]);
    expect(getCardExtensions(m).map((c) => c.properties.title)).toEqual(['First', 'Second']);
  });
});

describe('parseCodeRef', () => {
  it('parses a bare module reference as a default export', () => {
    expect(parseCodeRef('InstanceList')).toEqual({ module: 'InstanceList' });
  });

  it('parses Module.export form', () => {
    expect(parseCodeRef('InstanceList.Table')).toEqual({
      module: 'InstanceList',
      exportName: 'Table',
    });
  });

  it('only splits on the first dot', () => {
    expect(parseCodeRef('Mod.a.b')).toEqual({ module: 'Mod', exportName: 'a.b' });
  });
});

describe('pickCodeRefExport', () => {
  // Explicit generics keep the result concretely typed; without them the
  // `unknown` return trips bun's `expect` overloads (Matchers<undefined>).
  it('returns the default export for a bare ref', () => {
    const comp = () => null;
    const result = pickCodeRefExport<() => null>({ default: comp }, parseCodeRef('Mod'));
    expect(result).toBe(comp);
  });

  it('returns the named export when specified', () => {
    const comp = () => null;
    const result = pickCodeRefExport<() => null>({ Table: comp }, parseCodeRef('Mod.Table'));
    expect(result).toBe(comp);
  });

  it('falls back to the namespace when there is no default export', () => {
    const ns = { a: 1 };
    const result = pickCodeRefExport<{ a: number }>(ns, parseCodeRef('Mod'));
    expect(result).toBe(ns);
  });

  it('returns undefined for a missing named export', () => {
    const result = pickCodeRefExport<() => null>({ default: () => null }, parseCodeRef('Mod.Nope'));
    expect(result).toBeUndefined();
  });

  it('returns undefined for a null module', () => {
    const result = pickCodeRefExport<() => null>(null, parseCodeRef('Mod'));
    expect(result).toBeUndefined();
  });
});
