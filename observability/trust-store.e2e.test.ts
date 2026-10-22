/// <reference types="bun-types/test" />
import { getTrustStoreResult, isEmSign } from './trust-store';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

type BunProcess = {
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  exited: Promise<number>;
};

type BunServer = {
  port: number;
  stop(force?: boolean): void;
};

type BunRuntime = {
  serve(options: {
    port: number;
    tls: { cert: string; key: string };
    fetch: () => Response;
  }): BunServer;
  spawn(
    command: string[],
    options: {
      cwd: string;
      env: Record<string, string | undefined>;
      stdout: 'pipe';
      stderr: 'pipe';
    }
  ): BunProcess;
};

type ChildResult = {
  status: string | null;
  fetch: boolean;
  https: boolean;
};

const bun = (globalThis as unknown as { Bun: BunRuntime }).Bun;
const childPath = fileURLToPath(new URL('./__fixtures__/trust-store-child.ts', import.meta.url));

let directory: string;
let caPath: string;
let server: BunServer;
let url: string;

async function child(mode: string): Promise<ChildResult> {
  const proc = bun.spawn([process.execPath, childPath, url, mode], {
    cwd: directory,
    env: { ...process.env, NODE_EXTRA_CA_CERTS: caPath },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`child ${mode} exited ${exitCode}: ${stderr}`);
  }

  return JSON.parse(stdout.trim().split('\n').at(-1) ?? '') as ChildResult;
}

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), 'trust-store-'));

  const caKey = join(directory, 'ca.key');
  caPath = join(directory, 'ca.pem');
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'ec',
      '-pkeyopt',
      'ec_paramgen_curve:P-256',
      '-nodes',
      '-keyout',
      caKey,
      '-out',
      caPath,
      '-days',
      '1',
      '-subj',
      '/CN=Trust Store Test CA',
    ],
    { cwd: directory }
  );

  const serverKey = join(directory, 'server.key');
  const serverCsr = join(directory, 'server.csr');
  const serverCert = join(directory, 'server.pem');
  execFileSync(
    'openssl',
    [
      'req',
      '-new',
      '-newkey',
      'ec',
      '-pkeyopt',
      'ec_paramgen_curve:P-256',
      '-nodes',
      '-keyout',
      serverKey,
      '-out',
      serverCsr,
      '-subj',
      '/CN=localhost',
    ],
    { cwd: directory }
  );

  const extensions = join(directory, 'ext.cnf');
  writeFileSync(extensions, 'subjectAltName=DNS:localhost,IP:127.0.0.1\n');
  execFileSync(
    'openssl',
    [
      'x509',
      '-req',
      '-in',
      serverCsr,
      '-CA',
      caPath,
      '-CAkey',
      caKey,
      '-CAcreateserial',
      '-out',
      serverCert,
      '-days',
      '1',
      '-extfile',
      extensions,
    ],
    { cwd: directory }
  );

  server = bun.serve({
    port: 0,
    tls: {
      cert: readFileSync(serverCert, 'utf8'),
      key: readFileSync(serverKey, 'utf8'),
    },
    fetch: () => new Response('ok'),
  });
  url = `https://localhost:${server.port}/`;
});

afterAll(() => {
  server.stop(true);
  rmSync(directory, { recursive: true, force: true });
});

describe('trust store end to end', () => {
  it('trusts the NODE_EXTRA_CA_CERTS root with no shim', async () => {
    expect(await child('baseline')).toEqual({ status: null, fetch: true, https: true });
  });

  it('rejects a distrusted root on fetch and node:https', async () => {
    expect(await child('shim-test-ca')).toEqual({ status: 'applied', fetch: false, https: false });
  });

  it('keeps the NODE_EXTRA_CA_CERTS root when dropping emSign', async () => {
    expect(await child('shim-emsign')).toEqual({ status: 'applied', fetch: true, https: true });
  });

  it('keeps serving requests when the shim fails', async () => {
    expect(await child('shim-throw')).toEqual({ status: 'failed', fetch: true, https: true });
  });

  it('runs as a test preload and leaves no emSign root in the default list', () => {
    expect(getTrustStoreResult()?.status).toBe('applied');
    expect(
      tls.getCACertificates('default').some((p) => isEmSign(new X509Certificate(p).subject))
    ).toBe(false);
  });
});
