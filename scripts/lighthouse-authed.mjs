#!/usr/bin/env bun
// Run Lighthouse against an authenticated cloud-portal route by injecting
// a signed _session cookie via Chrome DevTools Protocol (CDP) before navigation.
//
// This approach sets the cookie directly in the browser's cookie jar so it is
// sent on ALL requests (including client-side fetches after hydration), not just
// the first navigation. --extra-headers only covers the initial navigation and
// fails once the React app hydrates and fires client-side fetch calls.
//
// Usage:
//   bun scripts/lighthouse-authed.mjs <url> <output-json-path> [chrome-user-data-dir]
//
// Env requirements: ACCESS_TOKEN, SUB, SESSION_SECRET (loaded from .env).

import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createCookie, createCookieSessionStorage } from 'react-router';

const [, , url, outputPath, userDataDir = `/tmp/lh-authed-${Date.now()}`] = process.argv;

if (!url || !outputPath) {
  console.error('Usage: bun scripts/lighthouse-authed.mjs <url> <output-json-path> [chrome-user-data-dir]');
  process.exit(1);
}

const { ACCESS_TOKEN, SUB, SESSION_SECRET } = process.env;
if (!ACCESS_TOKEN || !SUB || !SESSION_SECRET) {
  console.error('Missing one of ACCESS_TOKEN, SUB, SESSION_SECRET in .env');
  process.exit(1);
}

// --- Generate the signed session cookie value (same path as Cypress) ---
const sessionCookie = createCookie('_session', {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 13,
  secrets: [SESSION_SECRET],
  secure: false, // dev/test
});
const sessionStorage = createCookieSessionStorage({ cookie: sessionCookie });
const session = await sessionStorage.getSession();
session.set('_session', {
  accessToken: ACCESS_TOKEN,
  sub: SUB,
  expiredAt: new Date(Date.now() + 60 * 60 * 13 * 1000).toISOString(),
});
const setCookieHeader = await sessionStorage.commitSession(session);
const match = setCookieHeader.match(/^_session=([^;]+)/);
if (!match) {
  console.error('Failed to extract cookie value from Set-Cookie header');
  process.exit(1);
}
const cookieValue = match[1];

mkdirSync(dirname(outputPath), { recursive: true });
mkdirSync(userDataDir, { recursive: true });

// --- Find a free port for Chrome's remote debugging ---
const cdpPort = await new Promise((resolve, reject) => {
  const srv = createServer();
  srv.listen(0, '127.0.0.1', () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  });
  srv.on('error', reject);
});

// Parse hostname and port for the cookie domain
const parsedUrl = new URL(url);
const cookieDomain = parsedUrl.hostname; // e.g. "localhost"

console.log(`Running Lighthouse against ${url} with auth cookie (CDP port ${cdpPort})...`);
console.log(`Output: ${outputPath}`);

// --- Launch Chrome with remote debugging enabled ---
const chromePath = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chromeArgs = [
  `--remote-debugging-port=${cdpPort}`,
  `--user-data-dir=${userDataDir}`,
  '--disk-cache-size=104857600',
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
];

const chromeProc = spawn(chromePath, chromeArgs, {
  stdio: ['ignore', 'ignore', 'ignore'],
  detached: false,
});

chromeProc.on('error', (err) => {
  console.error('Failed to launch Chrome:', err.message);
  process.exit(1);
});

// --- Wait for Chrome to be ready ---
async function waitForChrome(port, maxMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch (_) {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Chrome did not start on port ${port} within ${maxMs}ms`);
}

let chromeVersion;
try {
  chromeVersion = await waitForChrome(cdpPort);
  console.log(`Chrome ready: ${chromeVersion.Browser}`);
} catch (err) {
  chromeProc.kill();
  console.error(err.message);
  process.exit(1);
}

// --- Inject cookie via CDP before Lighthouse runs ---
// Open a new tab, use CDP to set the cookie, then close the tab.
// Lighthouse will connect to the same Chrome instance.
async function injectCookieViaCDP(port) {
  // Get the existing page's WebSocket URL
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  const target = targets.find(t => t.type === 'page') || targets[0];
  if (!target) throw new Error('No CDP target found');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let msgId = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = msgId++;
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  // Set the session cookie in the browser's cookie store
  await send('Network.enable');
  await send('Network.setCookie', {
    name: '_session',
    value: cookieValue,
    domain: cookieDomain,
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: false,
  });

  ws.close();
  console.log(`Cookie injected for domain=${cookieDomain}`);
}

try {
  await injectCookieViaCDP(cdpPort);
} catch (err) {
  chromeProc.kill();
  console.error('Failed to inject cookie:', err.message);
  process.exit(1);
}

// --- Run Lighthouse connecting to the existing Chrome instance ---
const args = [
  'lighthouse',
  url,
  '--output=json',
  `--output-path=${outputPath}`,
  `--port=${cdpPort}`,
  '--only-categories=performance',
  '--quiet',
  '--disable-storage-reset', // Don't clear cookies between navigations
];

const lhChild = spawn('bunx', args, { stdio: 'inherit' });

lhChild.on('exit', (code) => {
  chromeProc.kill();
  process.exit(code ?? 1);
});
