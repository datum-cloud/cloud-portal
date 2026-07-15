/**
 * Long-running process orchestration for the plugin e2e suite.
 *
 * global-setup spawns the sample plugin + one or two portal processes and waits
 * for each to become healthy. PIDs (as process-group leaders) and any teardown
 * commands are persisted to a pidfile so global-teardown — which runs as a
 * separate module invocation — can stop everything even after a crash.
 */
import { ARTIFACTS_DIR, PIDFILE } from './config';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const LOG_DIR = path.join(ARTIFACTS_DIR, 'logs');

interface ServerRecord {
  name: string;
  pid: number;
  logFile: string;
}
interface TeardownCommand {
  name: string;
  command: string;
  cwd?: string;
}
interface Pidfile {
  servers: ServerRecord[];
  teardownCommands: TeardownCommand[];
}

function ensureDirs() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function readPidfile(): Pidfile {
  try {
    return JSON.parse(fs.readFileSync(PIDFILE, 'utf8'));
  } catch {
    return { servers: [], teardownCommands: [] };
  }
}

function writePidfile(pf: Pidfile) {
  ensureDirs();
  fs.writeFileSync(PIDFILE, JSON.stringify(pf, null, 2));
}

export function resetPidfile() {
  ensureDirs();
  writePidfile({ servers: [], teardownCommands: [] });
}

/** Register a command to run during teardown (e.g. `task devenv:down`). */
export function registerTeardownCommand(cmd: TeardownCommand) {
  const pf = readPidfile();
  pf.teardownCommands.push(cmd);
  writePidfile(pf);
}

export interface StartOptions {
  name: string;
  command: string;
  cwd: string;
  env?: Record<string, string | undefined>;
}

/**
 * Spawn a detached process (its own process group) with output tee'd to a log
 * file, and record it in the pidfile. Returns the log path for diagnostics.
 */
export function startServer(opts: StartOptions): { pid: number; logFile: string } {
  ensureDirs();
  const logFile = path.join(LOG_DIR, `${opts.name}.log`);
  const out = fs.openSync(logFile, 'a');
  fs.writeFileSync(
    logFile,
    `\n=== ${opts.name}: ${opts.command} @ ${new Date().toISOString()} ===\n`
  );

  const child = spawn('/bin/sh', ['-c', opts.command], {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env } as NodeJS.ProcessEnv,
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();

  if (!child.pid) throw new Error(`Failed to spawn ${opts.name}`);

  const pf = readPidfile();
  pf.servers.push({ name: opts.name, pid: child.pid, logFile });
  writePidfile(pf);

  return { pid: child.pid, logFile };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll an HTTP URL until it responds with `expectStatus` (default any 2xx). */
export async function waitForHttp(
  url: string,
  opts: { timeoutMs?: number; expectStatus?: number; label?: string; logFile?: string } = {}
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const deadline = Date.now() + timeoutMs;
  let lastErr = '';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (opts.expectStatus ? res.status === opts.expectStatus : res.ok) return;
      lastErr = `status ${res.status}`;
    } catch (e) {
      lastErr = (e as Error).message;
    }
    await sleep(500);
  }
  const tail = opts.logFile
    ? `\n--- last log lines (${opts.logFile}) ---\n${tailFile(opts.logFile)}`
    : '';
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for ${opts.label ?? url} (last: ${lastErr}).${tail}`
  );
}

/** Poll for a file to exist (used for kwok's kubeconfig). */
export async function waitForFile(file: string, timeoutMs = 60_000, label?: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return;
    await sleep(300);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for file ${label ?? file}`);
}

export function tailFile(file: string, lines = 40): string {
  try {
    const all = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    return all.slice(-lines).join('\n');
  } catch {
    return '(no log)';
  }
}

/** Kill a process group; ignore if already gone. */
function killGroup(pid: number, signal: NodeJS.Signals) {
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      /* already dead */
    }
  }
}

/** Stop every recorded server and run teardown commands. Safe to call twice. */
export async function stopAll(): Promise<void> {
  const pf = readPidfile();

  for (const t of pf.teardownCommands) {
    try {
      const { execSync } = await import('node:child_process');
      execSync(t.command, { cwd: t.cwd, stdio: 'ignore', timeout: 120_000 });
    } catch {
      /* best effort */
    }
  }

  for (const s of pf.servers) killGroup(s.pid, 'SIGTERM');
  await sleep(1500);
  for (const s of pf.servers) killGroup(s.pid, 'SIGKILL');

  resetPidfile();
}
