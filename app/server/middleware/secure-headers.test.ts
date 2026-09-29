/// <reference types="bun-types/test" />
import { secureHeadersMiddleware } from './secure-headers';
import { EMPTY_PLUGIN_CSP_ADDITIONS, type PluginCspAdditions } from '@/modules/plugins/server/csp';
import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';

const BASE_POLICY =
  "report-to ; default-src 'self'; connect-src 'self' https://api.example.com https://*.sentry.io https://*.datum.net https://*.cloudfront.net https://*.helpscout.net https://app.rybbit.io https://api.stripe.com https://maps.googleapis.com https://places.googleapis.com; font-src 'self' 'unsafe-inline' https://*.jsdelivr.net https://*.gstatic.com https://*.helpscout.net; frame-src 'self' https://*.sentry.io https://*.datum.net https://*.cloudfront.net https://*.helpscout.net https://js.stripe.com https://hooks.stripe.com; img-src 'self' data: https://*.googleusercontent.com https://*.githubusercontent.com https://avatars.githubusercontent.com https://*.cloudfront.net https://*.cartocdn.com https://*.basemaps.cartocdn.com https://*.stripe.com; script-src 'strict-dynamic' 'self' 'nonce-N' https://maps.googleapis.com https://*.gstatic.com; script-src-elem 'strict-dynamic' 'self' https://js.sentry-cdn.com https://browser.sentry-cdn.com https://js.stripe.com https://maps.googleapis.com https://*.gstatic.com 'nonce-N'; script-src-attr 'nonce-N'; style-src 'self' 'unsafe-inline' https://*.jsdelivr.net https://*.googleapis.com; upgrade-insecure-requests";

const RELAY = 'iroh-relay.us-central-1.datumconnect.net';

async function policy(getPluginCspAdditions?: () => PluginCspAdditions) {
  const app = new Hono();
  app.use(
    '*',
    secureHeadersMiddleware({
      isDev: false,
      apiUrl: 'https://api.example.com',
      getPluginCspAdditions,
    })
  );
  app.get('/', (c) => c.text('ok'));
  const header = (await app.request('/')).headers.get('Content-Security-Policy') ?? '';
  const nonces = [...header.matchAll(/'nonce-([^']+)'/g)].map((m) => m[1]);
  return { header, nonces, normalized: header.replace(/'nonce-[^']+'/g, "'nonce-N'") };
}

function directive(header: string, name: string) {
  return header
    .split('; ')
    .find((d) => d.startsWith(`${name} `))
    ?.split(' ')
    .slice(1);
}

describe('secureHeadersMiddleware', () => {
  test('base policy is unchanged when no plugin declares additions', async () => {
    expect((await policy()).normalized).toBe(BASE_POLICY);
    expect((await policy(() => EMPTY_PLUGIN_CSP_ADDITIONS)).normalized).toBe(BASE_POLICY);
  });

  test('applies plugin additions and keeps the nonce and strict-dynamic', async () => {
    const { header, nonces } = await policy(() => ({
      scriptSrc: ["'wasm-unsafe-eval'"],
      workerSrc: ["'self'"],
      connectSrc: [`https://${RELAY}`, `wss://${RELAY}`],
    }));

    const scriptSrc = directive(header, 'script-src');
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).toContain("'wasm-unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(directive(header, 'script-src-elem')).not.toContain("'wasm-unsafe-eval'");
    expect(directive(header, 'worker-src')).toEqual(["'self'"]);
    expect(directive(header, 'connect-src')).toEqual(
      expect.arrayContaining(["'self'", `https://${RELAY}`, `wss://${RELAY}`])
    );

    expect(nonces.length).toBe(3);
    expect(new Set(nonces).size).toBe(1);
  });

  test('issues a fresh nonce per request', async () => {
    const a = await policy();
    const b = await policy();
    expect(a.nonces[0]).toBeTruthy();
    expect(a.nonces[0]).not.toBe(b.nonces[0]);
  });

  test('follows additions as they change', async () => {
    let additions: PluginCspAdditions = {
      ...EMPTY_PLUGIN_CSP_ADDITIONS,
      scriptSrc: ["'wasm-unsafe-eval'"],
    };
    const app = new Hono();
    app.use('*', secureHeadersMiddleware({ isDev: false, getPluginCspAdditions: () => additions }));
    app.get('/', (c) => c.text('ok'));
    const csp = async () => (await app.request('/')).headers.get('Content-Security-Policy') ?? '';

    expect(await csp()).toContain("'wasm-unsafe-eval'");
    additions = EMPTY_PLUGIN_CSP_ADDITIONS;
    expect(await csp()).not.toContain("'wasm-unsafe-eval'");
  });
});
