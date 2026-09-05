#!/usr/bin/env bun
/**
 * Generate traffic against a Datum ALB so Metrics charts have something to show:
 * 2xx, 4xx, mixed methods, and OWASP CRS / Coraza rule hits.
 *
 * Usage:
 *   bun scripts/alb-load.mjs
 *   bun scripts/alb-load.mjs --url https://strand-fewer-8xyhf.prism.staging.env.datum.net
 *   bun scripts/alb-load.mjs --duration 90 --concurrency 12
 *   bun scripts/alb-load.mjs --count 400
 *
 * Refresh the Metrics tab after a minute or two (or change the time range)
 * so the query window includes this run.
 */

const DEFAULT_URL = 'https://strand-fewer-8xyhf.prism.staging.env.datum.net';

const args = parseArgs(process.argv.slice(2));
const baseUrl = new URL(args.url ?? DEFAULT_URL).origin;
const concurrency = clampInt(args.concurrency, 1, 32, 8);
const durationSec = args.duration != null ? clampInt(args.duration, 1, 3600, 60) : null;
const count = durationSec == null ? clampInt(args.count, 1, 20_000, 300) : null;
const timeoutMs = clampInt(args.timeout, 1000, 30_000, 10_000);

/** Harmless CRS fixtures — the same class of strings WAF labs use to trip rules. */
const WAF_PROBES = [
  { name: 'sqli-or', path: '/?id=1%27+OR+%271%27%3D%271' },
  { name: 'sqli-union', path: '/?q=1+UNION+SELECT+null%2Cnull' },
  { name: 'xss-script', path: '/?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E' },
  { name: 'xss-img', path: '/?q=%3Cimg+src%3Dx+onerror%3Dalert(1)%3E' },
  { name: 'lfi', path: '/?file=..%2F..%2F..%2Fetc%2Fpasswd' },
  { name: 'rfi', path: '/?url=http%3A%2F%2F127.0.0.1%2F' },
  { name: 'cmd', path: '/?cmd=cat%20%2Fetc%2Fpasswd' },
  { name: 'log4j', path: '/?x=%24%7Bjndi%3Aldap%3A%2F%2F127.0.0.1%2Fa%7D' },
  { name: 'scanner-ua', path: '/', headers: { 'user-agent': 'sqlmap/1.7.11' } },
  { name: 'scanner-nikto', path: '/', headers: { 'user-agent': 'Nikto/2.5.0' } },
];

const REQUESTS = [
  { name: 'ok-home', weight: 8, method: 'GET', path: '/' },
  { name: 'ok-head', weight: 2, method: 'HEAD', path: '/' },
  { name: 'ok-favicon', weight: 2, method: 'GET', path: '/favicon.ico' },
  { name: 'options', weight: 1, method: 'OPTIONS', path: '/' },
  { name: 'missing', weight: 4, method: 'GET', path: '/this-path-does-not-exist-metrics-probe' },
  { name: 'api-miss', weight: 2, method: 'GET', path: '/api/definitely-not-a-route' },
  { name: 'post-home', weight: 2, method: 'POST', path: '/', body: '{}' },
  { name: 'put-home', weight: 1, method: 'PUT', path: '/', body: '{}' },
  { name: 'patch-home', weight: 1, method: 'PATCH', path: '/', body: '{}' },
  { name: 'delete-home', weight: 1, method: 'DELETE', path: '/' },
  ...WAF_PROBES.map((probe) => ({
    name: `waf-${probe.name}`,
    weight: 2,
    method: 'GET',
    path: probe.path,
    headers: probe.headers,
  })),
];

const weighted = REQUESTS.flatMap((req) => Array.from({ length: req.weight }, () => req));

const totals = {
  sent: 0,
  ok: 0,
  failed: 0,
  byStatus: /** @type {Record<string, number>} */ ({}),
  byName: /** @type {Record<string, number>} */ ({}),
};

const startedAt = Date.now();
const deadline = durationSec != null ? startedAt + durationSec * 1000 : null;
let remaining = count ?? Number.POSITIVE_INFINITY;
let stopping = false;

process.on('SIGINT', () => {
  stopping = true;
});

console.log(
  [
    `Target       ${baseUrl}`,
    durationSec != null ? `Duration     ${durationSec}s` : `Count        ${count}`,
    `Concurrency  ${concurrency}`,
    `Mix          ${REQUESTS.length} request shapes (status + WAF probes)`,
    '',
  ].join('\n')
);

await Promise.all(Array.from({ length: concurrency }, () => worker()));
printSummary();

async function worker() {
  while (!stopping && remaining > 0 && (deadline == null || Date.now() < deadline)) {
    remaining -= 1;
    const spec = weighted[Math.floor(Math.random() * weighted.length)];
    await fire(spec);
  }
}

async function fire(spec) {
  const url = new URL(spec.path, baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: spec.method,
      headers: {
        accept: '*/*',
        ...(spec.body ? { 'content-type': 'application/json' } : {}),
        ...spec.headers,
      },
      body: spec.body,
      signal: controller.signal,
      redirect: 'manual',
    });
    record(spec.name, String(response.status));
    await response.body?.cancel();
  } catch (error) {
    const reason = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'error';
    record(spec.name, reason);
  } finally {
    clearTimeout(timer);
  }
}

function record(name, status) {
  totals.sent += 1;
  totals.byStatus[status] = (totals.byStatus[status] ?? 0) + 1;
  totals.byName[name] = (totals.byName[name] ?? 0) + 1;
  if (status === 'error' || status === 'timeout') totals.failed += 1;
  else totals.ok += 1;

  if (totals.sent % 25 === 0) {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    process.stdout.write(`  ${totals.sent} requests in ${elapsed}s\r`);
  }
}

function printSummary() {
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\nDone. ${totals.sent} requests in ${elapsed}s (${totals.ok} ok, ${totals.failed} failed)\n`);
  console.log('Status');
  for (const [status, n] of Object.entries(totals.byStatus).sort(sortNumericKey)) {
    console.log(`  ${status.padEnd(8)} ${n}`);
  }
  console.log('\nBy shape');
  for (const [name, n] of Object.entries(totals.byName).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name.padEnd(22)} ${n}`);
  }
}

function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = 'true';
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sortNumericKey(a, b) {
  const left = Number.parseInt(a[0], 10);
  const right = Number.parseInt(b[0], 10);
  if (Number.isFinite(left) && Number.isFinite(right)) return left - right;
  return a[0].localeCompare(b[0]);
}
