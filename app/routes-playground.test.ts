import { isPlaygroundEnabled } from './routes';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The /test/* playground pages must never be part of a production route
 * table. routes.ts decides at module load, so each table is built in a fresh
 * process with NODE_ENV set the way `react-router build` and `dev` set it.
 */

const ROUTES_MODULE = fileURLToPath(new URL('./routes.ts', import.meta.url));

const LIST_PATHS = `
  const { default: routes } = await import(${JSON.stringify(ROUTES_MODULE)});
  const walk = (entries) => entries.flatMap((e) => [e.path ?? '', ...walk(e.children ?? [])]);
  console.log(JSON.stringify(walk(routes)));
`;

function routePathsFor(nodeEnv: string): string[] {
  const result = spawnSync(process.execPath, ['-e', LIST_PATHS], {
    env: { ...process.env, NODE_ENV: nodeEnv },
  });
  if (result.status !== 0) throw new Error(result.stderr.toString());
  return JSON.parse(result.stdout.toString().trim().split('\n').at(-1) ?? '[]');
}

const isPlaygroundPath = (path: string) => path === 'test' || path.startsWith('test/');

describe('playground routes', () => {
  it('are absent from the production route table', () => {
    const paths = routePathsFor('production');
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter(isPlaygroundPath)).toEqual([]);
  });

  it.each(['development', 'test'])('are registered when NODE_ENV=%s', (nodeEnv) => {
    expect(routePathsFor(nodeEnv).filter(isPlaygroundPath).sort()).toEqual([
      'test/demo',
      'test/dns-record',
      'test/sentry',
    ]);
  });

  it('treats only production as production', () => {
    expect(isPlaygroundEnabled('production')).toBe(false);
    expect(isPlaygroundEnabled('development')).toBe(true);
    expect(isPlaygroundEnabled('test')).toBe(true);
    expect(isPlaygroundEnabled(undefined)).toBe(true);
  });
});
