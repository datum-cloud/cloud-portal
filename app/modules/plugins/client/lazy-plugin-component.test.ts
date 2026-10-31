import { describe, expect, it } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Regression guard for first paint on project pages. The federation host pulls
 * in `@module-federation/runtime` and the whole shared-module table (~100 kB).
 * It must load only when a plugin mounts, so every other app file may import it
 * for types only; the loader reaches it through a dynamic `import()`.
 *
 * The whole `app/` tree is scanned rather than a list of slot files, so a new
 * importer, or one using the `@/` alias, cannot slip past the guard.
 */
const STATIC_HOST_IMPORT =
  /^import\s+(?!type\b)[^;]*from\s+['"](?:\.\/|@\/modules\/plugins\/client\/)federation-host['"]/m;

const appDir = fileURLToPath(new URL('../../../', import.meta.url));

const appSources = readdirSync(appDir, { recursive: true })
  .map(String)
  .filter((path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path))
  .filter((path) => !path.endsWith('federation-host.ts'))
  .sort();

function source(path: string): string {
  return readFileSync(`${appDir}/${path}`, 'utf8');
}

describe('federation host loading', () => {
  it('finds the app sources to check', () => {
    expect(appSources).toContain('modules/plugins/client/lazy-plugin-component.tsx');
  });

  it('no app file statically imports the federation host', () => {
    const offenders = appSources.filter((path) => STATIC_HOST_IMPORT.test(source(path)));
    expect(offenders).toEqual([]);
  });

  it('the guard pattern catches a static value import, relative or aliased', () => {
    expect("import { loadPluginComponent } from './federation-host';").toMatch(STATIC_HOST_IMPORT);
    expect(
      "import { loadPluginComponent } from '@/modules/plugins/client/federation-host';"
    ).toMatch(STATIC_HOST_IMPORT);
    expect("import type { PluginRemoteRef } from './federation-host';").not.toMatch(
      STATIC_HOST_IMPORT
    );
    expect(
      "import type { PluginRemoteRef } from '@/modules/plugins/client/federation-host';"
    ).not.toMatch(STATIC_HOST_IMPORT);
  });

  it('lazy-plugin-component loads the host with a dynamic import', () => {
    expect(source('modules/plugins/client/lazy-plugin-component.tsx')).toContain(
      "import('./federation-host')"
    );
  });
});
