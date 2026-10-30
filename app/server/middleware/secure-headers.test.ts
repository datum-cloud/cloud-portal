import { secureHeadersMiddleware, sentryCspReportUri } from './secure-headers';
import { EMPTY_PLUGIN_CSP_ADDITIONS, type PluginCspAdditions } from '@/modules/plugins/server/csp';
import { Hono } from 'hono';
import { describe, expect, test } from 'vitest';

const BASE_POLICY =
  "report-to ; default-src 'self'; connect-src 'self' https://api.example.com https://*.sentry.io https://*.datum.net https://*.cloudfront.net https://*.helpscout.net https://app.rybbit.io https://api.stripe.com https://maps.googleapis.com https://places.googleapis.com; font-src 'self' https://*.jsdelivr.net https://*.gstatic.com https://*.helpscout.net; frame-src 'self' https://*.sentry.io https://*.datum.net https://*.cloudfront.net https://*.helpscout.net https://js.stripe.com https://hooks.stripe.com; img-src 'self' data: https://*.googleusercontent.com https://*.githubusercontent.com https://avatars.githubusercontent.com https://*.cloudfront.net https://*.cartocdn.com https://*.basemaps.cartocdn.com https://*.stripe.com; script-src 'strict-dynamic' 'self' 'nonce-N' https://maps.googleapis.com https://*.gstatic.com; script-src-elem 'strict-dynamic' 'self' https://js.sentry-cdn.com https://browser.sentry-cdn.com https://js.stripe.com https://maps.googleapis.com https://*.gstatic.com 'nonce-N'; script-src-attr 'nonce-N'; style-src 'self' 'unsafe-inline' https://*.jsdelivr.net https://*.googleapis.com; upgrade-insecure-requests";

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
      connectSrc: [`https://${RELAY}`, `wss://${RELAY}`],
    }));

    const scriptSrc = directive(header, 'script-src');
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).toContain("'wasm-unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(directive(header, 'script-src-elem')).not.toContain("'wasm-unsafe-eval'");
    expect(header).not.toContain('worker-src');
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

describe('report-only policy', () => {
  const SENTRY_REPORT_URI = 'https://sentry.test/api/42/security/?sentry_key=pub';

  async function headers() {
    const app = new Hono();
    app.use(
      '*',
      secureHeadersMiddleware({
        isDev: false,
        apiUrl: 'https://api.example.com',
        authOrigin: 'https://auth.example.com',
        cspReportUri: SENTRY_REPORT_URI,
      })
    );
    app.get('/', (c) => c.text('ok'));
    const res = await app.request('/');
    return {
      enforced: res.headers.get('Content-Security-Policy') ?? '',
      reportOnly: res.headers.get('Content-Security-Policy-Report-Only') ?? '',
    };
  }

  test('adds base-uri, object-src, form-action and frame-ancestors', async () => {
    const { reportOnly } = await headers();
    expect(directive(reportOnly, 'base-uri')).toEqual(["'self'"]);
    expect(directive(reportOnly, 'object-src')).toEqual(["'none'"]);
    expect(directive(reportOnly, 'form-action')).toEqual(["'self'", 'https://auth.example.com']);
    expect(directive(reportOnly, 'frame-ancestors')).toEqual(["'self'"]);
    expect(directive(reportOnly, 'report-uri')).toEqual([SENTRY_REPORT_URI]);
    expect(reportOnly).not.toContain('report-to');
  });

  test('keeps every source the enforced policy allows, with the same nonce', async () => {
    const { enforced, reportOnly } = await headers();
    for (const name of [
      'connect-src',
      'font-src',
      'frame-src',
      'img-src',
      'script-src',
      'style-src',
    ]) {
      expect(directive(reportOnly, name)).toEqual(directive(enforced, name));
    }
    const nonce = (header: string) => header.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce(reportOnly)).toBeTruthy();
    expect(nonce(reportOnly)).toBe(nonce(enforced));
  });

  test('font-src carries no unsafe-inline in either header', async () => {
    const { enforced, reportOnly } = await headers();
    expect(directive(enforced, 'font-src')).not.toContain("'unsafe-inline'");
    expect(directive(reportOnly, 'font-src')).not.toContain("'unsafe-inline'");
  });

  test('the enforced header does not gain the new directives yet', async () => {
    const { enforced } = await headers();
    for (const name of ['base-uri', 'object-src', 'form-action', 'frame-ancestors']) {
      expect(directive(enforced, name)).toBeUndefined();
    }
  });
});

describe('sentryCspReportUri', () => {
  test('builds the security endpoint from a DSN', () => {
    expect(sentryCspReportUri('https://pub@sentry.test/42')).toBe(
      'https://sentry.test/api/42/security/?sentry_key=pub'
    );
    expect(sentryCspReportUri('https://pub@sentry.test/prefix/42', 'staging')).toBe(
      'https://sentry.test/prefix/api/42/security/?sentry_key=pub&sentry_environment=staging'
    );
  });

  test('is undefined without a usable DSN', () => {
    expect(sentryCspReportUri(undefined)).toBeUndefined();
    expect(sentryCspReportUri('not a url')).toBeUndefined();
    expect(sentryCspReportUri('https://sentry.test/42')).toBeUndefined();
  });
});
