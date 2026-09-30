/// <reference types="bun-types/test" />
import type { PluginRegistryEntry } from '../types';
import {
  collectPluginCspAdditions,
  createPluginCspResolver,
  EMPTY_PLUGIN_CSP_ADDITIONS,
} from './csp';
import { describe, expect, mock, test } from 'bun:test';

const RELAY = 'iroh-relay.us-central-1.datumconnect.net';

function collect(contentSecurityPolicy: unknown[]) {
  const warn = mock(() => {});
  const additions = collectPluginCspAdditions([{ slug: 'compute', contentSecurityPolicy }], {
    warn,
  });
  return { additions, warn };
}

describe('collectPluginCspAdditions', () => {
  test('applies the allowlisted additions', () => {
    const { additions, warn } = collect([
      "script-src 'wasm-unsafe-eval'",
      `connect-src https://${RELAY} wss://${RELAY}`,
    ]);
    expect(additions).toEqual({
      scriptSrc: ["'wasm-unsafe-eval'"],
      connectSrc: [`https://${RELAY}`, `wss://${RELAY}`],
    });
    expect(warn).not.toHaveBeenCalled();
  });

  test.each([
    "script-src 'unsafe-eval'",
    "script-src 'unsafe-inline'",
    "script-src 'unsafe-hashes'",
    'script-src https://cdn.example.com',
    "script-src 'nonce-abc'",
    "worker-src 'self'",
    "worker-src 'self' blob:",
    'connect-src *',
    'connect-src https://*.datumconnect.net',
    'connect-src https://*',
    'connect-src data:',
    'connect-src blob:',
    'connect-src http://relay.example.com',
    'connect-src ws://relay.example.com',
    'connect-src https://relay.example.com:8443',
    'connect-src https://relay.example.com/path',
    'connect-src https://localhost',
    'connect-src https://10.0.0.1',
    'connect-src https://relay.example.com;',
    "style-src 'unsafe-inline'",
    "default-src 'self'",
    "frame-ancestors 'self'",
    'connect-src',
  ])('rejects %p', (entry) => {
    const { additions, warn } = collect([entry]);
    expect(additions).toEqual(EMPTY_PLUGIN_CSP_ADDITIONS);
    expect(warn).toHaveBeenCalled();
  });

  test('cannot smuggle a second directive through one entry', () => {
    const { additions } = collect([`connect-src https://${RELAY}; script-src 'unsafe-eval'`]);
    expect(additions).toEqual(EMPTY_PLUGIN_CSP_ADDITIONS);
  });

  test('ignores non-string entries', () => {
    const { additions, warn } = collect([42, { 'script-src': "'wasm-unsafe-eval'" }]);
    expect(additions).toEqual(EMPTY_PLUGIN_CSP_ADDITIONS);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  test('merges and deduplicates across plugins', () => {
    const additions = collectPluginCspAdditions(
      [
        { slug: 'b', contentSecurityPolicy: [`connect-src wss://${RELAY}`] },
        { slug: 'a', contentSecurityPolicy: [`connect-src wss://${RELAY} https://${RELAY}`] },
      ],
      { warn: () => {} }
    );
    expect(additions.connectSrc).toEqual([`https://${RELAY}`, `wss://${RELAY}`]);
  });
});

describe('createPluginCspResolver', () => {
  function entry(slug: string, contentSecurityPolicy?: string[]) {
    return { spec: { slug, contentSecurityPolicy } } as unknown as PluginRegistryEntry;
  }

  test('returns the shared empty additions when no plugin declares any', () => {
    const resolve = createPluginCspResolver(() => [entry('a'), entry('b', [])]);
    expect(resolve()).toBe(EMPTY_PLUGIN_CSP_ADDITIONS);
  });

  test('reparses and logs only when declarations change', () => {
    let plugins = [entry('compute', ["script-src 'unsafe-eval'", `connect-src https://${RELAY}`])];
    const warn = mock(() => {});
    const resolve = createPluginCspResolver(() => plugins, { warn });

    const first = resolve();
    expect(resolve()).toBe(first);
    expect(warn).toHaveBeenCalledTimes(1);

    plugins = [];
    expect(resolve()).toBe(EMPTY_PLUGIN_CSP_ADDITIONS);
  });
});
