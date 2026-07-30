/// <reference types="bun-types/test" />
import {
  ExecCredentialProvider,
  KubeClient,
  parseKubeconfig,
  resolveKubeContext,
  type ExecAuth,
} from './kubeconfig';
import { describe, expect, mock, test } from 'bun:test';

const INSECURE_LOOPBACK = `
apiVersion: v1
kind: Config
current-context: kwok
clusters:
- name: kwok-cluster
  cluster:
    server: http://127.0.0.1:8080
    insecure-skip-tls-verify: true
contexts:
- name: kwok
  context:
    cluster: kwok-cluster
    user: kwok-user
users:
- name: kwok-user
  user: {}
`;

const BEARER = `
apiVersion: v1
kind: Config
current-context: datum
clusters:
- name: datum-cluster
  cluster:
    server: https://api.datum.example.com/
contexts:
- name: datum
  context:
    cluster: datum-cluster
    user: datum-user
users:
- name: datum-user
  user:
    token: static-bearer-token
`;

// A kubeconfig as produced by `datumctl auth update-kubeconfig`.
const EXEC_CREDENTIAL = `
apiVersion: v1
kind: Config
current-context: datum
clusters:
- name: datum-cluster
  cluster:
    server: https://api.datum.example.com
contexts:
- name: datum
  context:
    cluster: datum-cluster
    user: datum-user
users:
- name: datum-user
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1
      command: datumctl
      args:
      - auth
      - get-token
      env:
      - name: DATUM_ENV
        value: staging
`;

describe('resolveKubeContext', () => {
  test('resolves an insecure no-auth loopback cluster', () => {
    const ctx = resolveKubeContext(parseKubeconfig(INSECURE_LOOPBACK));
    expect(ctx.server).toBe('http://127.0.0.1:8080');
    expect(ctx.tls.insecureSkipTlsVerify).toBe(true);
    expect(ctx.auth).toEqual({ kind: 'none' });
  });

  test('resolves a static bearer token and trims the server trailing slash', () => {
    const ctx = resolveKubeContext(parseKubeconfig(BEARER));
    expect(ctx.server).toBe('https://api.datum.example.com');
    expect(ctx.auth).toEqual({ kind: 'bearer', token: 'static-bearer-token' });
  });

  test('resolves an exec credential plugin with args and env', () => {
    const ctx = resolveKubeContext(parseKubeconfig(EXEC_CREDENTIAL));
    expect(ctx.auth.kind).toBe('exec');
    const auth = ctx.auth as ExecAuth;
    expect(auth.command).toBe('datumctl');
    expect(auth.args).toEqual(['auth', 'get-token']);
    expect(auth.env).toEqual({ DATUM_ENV: 'staging' });
    expect(auth.apiVersion).toBe('client.authentication.k8s.io/v1');
  });

  test('throws on a missing context', () => {
    expect(() => resolveKubeContext(parseKubeconfig(BEARER), 'does-not-exist')).toThrow();
  });

  test('parseKubeconfig throws on non-mapping YAML', () => {
    expect(() => parseKubeconfig('- just\n- a\n- list')).toThrow();
  });
});

function execAuth(): ExecAuth {
  return {
    kind: 'exec',
    apiVersion: 'client.authentication.k8s.io/v1',
    command: 'datumctl',
    args: ['auth', 'get-token'],
    env: {},
  };
}

function credential(token: string, expirationTimestamp?: string): string {
  return JSON.stringify({
    apiVersion: 'client.authentication.k8s.io/v1',
    kind: 'ExecCredential',
    status: { token, expirationTimestamp },
  });
}

describe('ExecCredentialProvider', () => {
  test('spawns the command and returns the parsed token', async () => {
    const runner = mock(async () =>
      credential('tok-1', new Date(Date.now() + 3_600_000).toISOString())
    );
    const provider = new ExecCredentialProvider(execAuth(), { runner });

    expect(await provider.getToken()).toBe('tok-1');
    expect(runner).toHaveBeenCalledTimes(1);
  });

  test('passes KUBERNETES_EXEC_INFO to the command', async () => {
    let capturedEnv: Record<string, string> = {};
    const runner = mock(async (_cmd: string, _args: string[], env: Record<string, string>) => {
      capturedEnv = env;
      return credential('tok-1');
    });
    await new ExecCredentialProvider(execAuth(), { runner }).getToken();
    expect(capturedEnv.KUBERNETES_EXEC_INFO).toBeDefined();
    expect(JSON.parse(capturedEnv.KUBERNETES_EXEC_INFO).kind).toBe('ExecCredential');
  });

  test('caches the token until near expiry, then re-runs', async () => {
    let now = 1_000_000;
    let n = 0;
    const runner = mock(async () => credential(`tok-${++n}`, new Date(now + 60_000).toISOString()));
    const provider = new ExecCredentialProvider(execAuth(), { runner, now: () => now });

    expect(await provider.getToken()).toBe('tok-1');
    // Well within validity — served from cache.
    now += 30_000;
    expect(await provider.getToken()).toBe('tok-1');
    expect(runner).toHaveBeenCalledTimes(1);

    // Past expiry (minus skew) — re-runs the command.
    now += 40_000;
    expect(await provider.getToken()).toBe('tok-2');
    expect(runner).toHaveBeenCalledTimes(2);
  });

  test('throws when the plugin returns non-JSON', async () => {
    const provider = new ExecCredentialProvider(execAuth(), { runner: async () => 'not json' });
    await expect(provider.getToken()).rejects.toThrow(/non-JSON/);
  });

  test('throws when the plugin returns no token', async () => {
    const provider = new ExecCredentialProvider(execAuth(), {
      runner: async () => JSON.stringify({ status: {} }),
    });
    await expect(provider.getToken()).rejects.toThrow(/no token/);
  });
});

describe('KubeClient', () => {
  test('injects a static bearer token on requests', async () => {
    let captured: Record<string, string> = {};
    const fetchImpl = mock(async (_url: string, init: RequestInit) => {
      captured = init.headers as Record<string, string>;
      return new Response('{}', { status: 200 });
    });
    const client = new KubeClient(resolveKubeContext(parseKubeconfig(BEARER)), {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.request('/apis/portal.miloapis.com/v1alpha1/portalplugins');
    expect(captured.Authorization).toBe('Bearer static-bearer-token');
    expect(fetchImpl.mock.calls[0][0]).toBe(
      'https://api.datum.example.com/apis/portal.miloapis.com/v1alpha1/portalplugins'
    );
  });

  test('injects an exec-resolved token on requests', async () => {
    let captured: Record<string, string> = {};
    const fetchImpl = mock(async (_url: string, init: RequestInit) => {
      captured = init.headers as Record<string, string>;
      return new Response('{}', { status: 200 });
    });
    const client = new KubeClient(resolveKubeContext(parseKubeconfig(EXEC_CREDENTIAL)), {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      runner: async () => credential('exec-token'),
    });

    await client.request('/healthz');
    expect(captured.Authorization).toBe('Bearer exec-token');
  });

  test('sends no auth header for a no-auth cluster', async () => {
    let captured: Record<string, string> = {};
    const fetchImpl = mock(async (_url: string, init: RequestInit) => {
      captured = init.headers as Record<string, string>;
      return new Response('{}', { status: 200 });
    });
    const client = new KubeClient(resolveKubeContext(parseKubeconfig(INSECURE_LOOPBACK)), {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.request('/healthz');
    expect(captured.Authorization).toBeUndefined();
  });
});
