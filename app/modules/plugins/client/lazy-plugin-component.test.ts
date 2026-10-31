import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

/**
 * Regression guard for first paint on project pages. The federation host pulls
 * in `@module-federation/runtime` and the whole shared-module table (~100 kB).
 * It must load only when a plugin mounts, so every file a project page renders
 * statically may import it for types only; the loader reaches it through a
 * dynamic `import()`.
 */
const SLOT_FILES = [
  'lazy-plugin-component.tsx',
  'plugin-dock.tsx',
  'plugin-header.tsx',
  'plugin-hero.tsx',
  'plugin-cards.tsx',
  'plugin-outlet.tsx',
];

const STATIC_HOST_IMPORT = /^import\s+(?!type\b)[^;]*from\s+['"]\.\/federation-host['"]/m;

function source(file: string): string {
  return readFileSync(new URL(file, import.meta.url), 'utf8');
}

describe('federation host loading', () => {
  it.each(SLOT_FILES)('%s does not statically import the federation host', (file) => {
    expect(source(file)).not.toMatch(STATIC_HOST_IMPORT);
  });

  it('the guard pattern catches a static value import', () => {
    expect("import { loadPluginComponent } from './federation-host';").toMatch(STATIC_HOST_IMPORT);
    expect("import type { PluginRemoteRef } from './federation-host';").not.toMatch(
      STATIC_HOST_IMPORT
    );
  });

  it('lazy-plugin-component loads the host with a dynamic import', () => {
    expect(source('lazy-plugin-component.tsx')).toContain("import('./federation-host')");
  });
});
