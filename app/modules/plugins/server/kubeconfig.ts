/**
 * Kubeconfig parsing + credential resolution for the kubeconfig registry source.
 *
 * Supports the three auth shapes a `PLUGIN_REGISTRY_KUBECONFIG` may carry:
 * - **No-auth / insecure** loopback clusters (kwok writes these).
 * - **Static bearer tokens**.
 * - **Exec credential plugins** (`client.authentication.k8s.io` ExecCredential):
 *   the command is spawned, its JSON parsed, and the token cached until its
 *   `expirationTimestamp`. This is what makes kubeconfigs produced by
 *   `datumctl auth update-kubeconfig` work against the local registry.
 *
 * Client-certificate auth is also honored opportunistically (real admin
 * kubeconfigs), passed through to the TLS layer.
 */
import type { TlsFetchInit } from './plugin-fetch';
import { load as loadYaml } from 'js-yaml';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';

// ── Raw kubeconfig shape (only the fields we consume) ──────────────────────

interface RawExec {
  apiVersion?: string;
  command?: string;
  args?: string[];
  env?: { name: string; value: string }[] | null;
}

interface RawUser {
  token?: string;
  exec?: RawExec;
  'client-certificate-data'?: string;
  'client-key-data'?: string;
}

interface RawCluster {
  server?: string;
  'certificate-authority-data'?: string;
  'certificate-authority'?: string;
  'insecure-skip-tls-verify'?: boolean;
}

interface RawKubeconfig {
  'current-context'?: string;
  contexts?: { name: string; context: { cluster: string; user: string } }[];
  clusters?: { name: string; cluster: RawCluster }[];
  users?: { name: string; user: RawUser }[];
}

// ── Resolved, normalized shape ─────────────────────────────────────────────

export interface ExecAuth {
  kind: 'exec';
  apiVersion: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export type ResolvedAuth = { kind: 'none' } | { kind: 'bearer'; token: string } | ExecAuth;

export interface ResolvedTls {
  caPem?: string;
  insecureSkipTlsVerify: boolean;
  clientCertPem?: string;
  clientKeyPem?: string;
}

export interface ResolvedKubeContext {
  server: string;
  tls: ResolvedTls;
  auth: ResolvedAuth;
}

function decodeBase64(data: string): string {
  return Buffer.from(data, 'base64').toString('utf8');
}

/** Parses raw kubeconfig YAML into a structured object. Throws on invalid YAML. */
export function parseKubeconfig(yamlText: string): RawKubeconfig {
  const doc = loadYaml(yamlText);
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('kubeconfig is empty or not a YAML mapping');
  }
  return doc as RawKubeconfig;
}

/**
 * Resolves the active context of a kubeconfig into a normalized server + TLS +
 * auth descriptor. `contextName` overrides `current-context`.
 */
export function resolveKubeContext(
  config: RawKubeconfig,
  contextName?: string
): ResolvedKubeContext {
  const targetContext = contextName ?? config['current-context'];
  if (!targetContext) {
    throw new Error('kubeconfig has no current-context and none was provided');
  }

  const context = config.contexts?.find((c) => c.name === targetContext)?.context;
  if (!context) {
    throw new Error(`kubeconfig context "${targetContext}" not found`);
  }

  const cluster = config.clusters?.find((c) => c.name === context.cluster)?.cluster;
  if (!cluster?.server) {
    throw new Error(`kubeconfig cluster "${context.cluster}" not found or has no server`);
  }

  const user = config.users?.find((u) => u.name === context.user)?.user ?? {};

  const tls: ResolvedTls = {
    insecureSkipTlsVerify: cluster['insecure-skip-tls-verify'] === true,
  };
  if (cluster['certificate-authority-data']) {
    tls.caPem = decodeBase64(cluster['certificate-authority-data']);
  } else if (cluster['certificate-authority']) {
    tls.caPem = readFileSync(cluster['certificate-authority'], 'utf8');
  }
  if (user['client-certificate-data']) {
    tls.clientCertPem = decodeBase64(user['client-certificate-data']);
  }
  if (user['client-key-data']) {
    tls.clientKeyPem = decodeBase64(user['client-key-data']);
  }

  return {
    server: cluster.server.replace(/\/+$/, ''),
    tls,
    auth: resolveAuth(user),
  };
}

function resolveAuth(user: RawUser): ResolvedAuth {
  if (user.token) {
    return { kind: 'bearer', token: user.token };
  }
  if (user.exec?.command) {
    const env: Record<string, string> = {};
    for (const e of user.exec.env ?? []) env[e.name] = e.value;
    return {
      kind: 'exec',
      apiVersion: user.exec.apiVersion ?? 'client.authentication.k8s.io/v1',
      command: user.exec.command,
      args: user.exec.args ?? [],
      env,
    };
  }
  return { kind: 'none' };
}

// ── Exec credential plugin protocol ────────────────────────────────────────

interface ExecCredential {
  apiVersion?: string;
  kind?: string;
  status?: {
    token?: string;
    expirationTimestamp?: string;
    clientCertificateData?: string;
    clientKeyData?: string;
  };
}

/** Runs an exec-plugin command and returns its stdout. Injectable for tests. */
export type CommandRunner = (
  command: string,
  args: string[],
  env: Record<string, string>
) => Promise<string>;

const defaultRunner: CommandRunner = (command, args, env) =>
  new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { env: { ...process.env, ...env }, timeout: 30_000, maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      }
    );
  });

/** Refresh a token this many ms before its stated expiry to avoid edge races. */
const EXPIRY_SKEW_MS = 10_000;

/**
 * Resolves and caches a bearer token from an exec credential plugin. Re-runs
 * the command only once the cached token is within {@link EXPIRY_SKEW_MS} of
 * expiry (or has none), mirroring kubectl's credential caching.
 */
export class ExecCredentialProvider {
  private readonly auth: ExecAuth;
  private readonly runner: CommandRunner;
  private readonly now: () => number;
  private cached: { token: string; expiresAt: number } | undefined;
  private inFlight: Promise<string> | undefined;

  constructor(auth: ExecAuth, options: { runner?: CommandRunner; now?: () => number } = {}) {
    this.auth = auth;
    this.runner = options.runner ?? defaultRunner;
    this.now = options.now ?? Date.now;
  }

  async getToken(): Promise<string> {
    const cached = this.cached;
    if (cached && cached.expiresAt - EXPIRY_SKEW_MS > this.now()) {
      return cached.token;
    }
    // Collapse concurrent misses into a single command execution.
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.run().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async run(): Promise<string> {
    const execInfo = JSON.stringify({
      apiVersion: this.auth.apiVersion,
      kind: 'ExecCredential',
      spec: { interactive: false },
    });

    const stdout = await this.runner(this.auth.command, this.auth.args, {
      ...this.auth.env,
      KUBERNETES_EXEC_INFO: execInfo,
    });

    let credential: ExecCredential;
    try {
      credential = JSON.parse(stdout);
    } catch {
      throw new Error(`exec credential plugin "${this.auth.command}" returned non-JSON output`);
    }

    const token = credential.status?.token;
    if (!token) {
      throw new Error(`exec credential plugin "${this.auth.command}" returned no token`);
    }

    const expiration = credential.status?.expirationTimestamp;
    // No expiry → cache briefly so we still avoid spawning per request.
    const expiresAt = expiration ? new Date(expiration).getTime() : this.now() + 60_000;
    this.cached = { token, expiresAt };
    return token;
  }
}

// ── Kube API client ────────────────────────────────────────────────────────

export interface KubeClientOptions {
  runner?: CommandRunner;
  now?: () => number;
  fetchImpl?: typeof fetch;
}

/**
 * A minimal authenticated Kubernetes API client over the resolved context.
 * Injects the bearer/exec token and applies TLS config on every request.
 */
export class KubeClient {
  readonly server: string;
  private readonly tls: ResolvedTls;
  private readonly auth: ResolvedAuth;
  private readonly fetchImpl: typeof fetch;
  private readonly execProvider?: ExecCredentialProvider;

  constructor(context: ResolvedKubeContext, options: KubeClientOptions = {}) {
    this.server = context.server;
    this.tls = context.tls;
    this.auth = context.auth;
    this.fetchImpl = options.fetchImpl ?? fetch;
    if (context.auth.kind === 'exec') {
      this.execProvider = new ExecCredentialProvider(context.auth, {
        runner: options.runner,
        now: options.now,
      });
    }
  }

  private async authHeader(): Promise<Record<string, string>> {
    switch (this.auth.kind) {
      case 'bearer':
        return { Authorization: `Bearer ${this.auth.token}` };
      case 'exec':
        return { Authorization: `Bearer ${await this.execProvider!.getToken()}` };
      case 'none':
        return {};
    }
  }

  private tlsInit(): TlsFetchInit['tls'] {
    const tls: NonNullable<TlsFetchInit['tls']> & {
      cert?: string;
      key?: string;
    } = {};
    if (this.tls.insecureSkipTlsVerify) tls.rejectUnauthorized = false;
    if (this.tls.caPem) tls.ca = this.tls.caPem;
    if (this.tls.clientCertPem) tls.cert = this.tls.clientCertPem;
    if (this.tls.clientKeyPem) tls.key = this.tls.clientKeyPem;
    return Object.keys(tls).length > 0 ? tls : undefined;
  }

  /** Issues an authenticated request against `{server}{path}`. */
  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const auth = await this.authHeader();
    const tls = this.tlsInit();
    const fetchInit: TlsFetchInit = {
      ...init,
      headers: { ...auth, ...(init.headers as Record<string, string> | undefined) },
    };
    if (tls) fetchInit.tls = tls;
    return this.fetchImpl(`${this.server}${path}`, fetchInit as RequestInit);
  }
}
