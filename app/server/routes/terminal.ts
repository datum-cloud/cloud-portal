/**
 * Terminal API route — WebSocket endpoint that brokers an embedded `datumctl`
 * session for the Developer Tools terminal panel.
 *
 * Protocol (JSON over WebSocket):
 *   Client → Server:
 *     { type: 'exec',  argv: string[] }                          — run `datumctl <argv>`
 *     { type: 'cancel' }                                         — SIGINT the current child process
 *     { type: 'upload-begin', id, name, size }                   — start a manifest upload
 *     { type: 'upload-chunk', id, data }                         — base64 bytes for that upload
 *     { type: 'upload-end',   id }                               — finalize and stage the file
 *     { type: 'upload-abort', id }                               — drop an in-progress upload
 *   Server → Client:
 *     { type: 'ready', user: {email, sub}, api, org, project, sessionId }
 *     { type: 'stdout', data }
 *     { type: 'stderr', data }
 *     { type: 'exit',   code }
 *     { type: 'error',  message }
 *     { type: 'upload-ok',    id, path, name, size }
 *     { type: 'upload-error', id, message }
 *
 * Each websocket owns at most one in-flight child process; a new `exec` while
 * another is running is rejected with an `error` message. The embedded
 * datumctl runs in "ambient-token" mode — DATUMCTL_TOKEN and friends bypass
 * the OS keyring, DATUM_PROJECT / DATUM_ORGANIZATION pin the context, and
 * any mutating auth/ctx subcommand is rejected inside datumctl itself.
 *
 * Uploads are tunnelled through the WebSocket (rather than a sibling HTTP
 * route) so that the bytes and the datumctl child always live on the same
 * replica. Without this, a round-robin load balancer would split a file POST
 * from the WS holding the scratch dir, and `datumctl apply -f <path>` would
 * fail roughly 1/N of the time on an N-replica deployment.
 *
 * The embedded terminal is disabled (WS returns 501) when DATUMCTL_BIN is
 * unset. This lets us ship a guarded UI affordance that no-ops in deployments
 * that do not bundle the binary.
 */
import type { Variables } from '@/server/types';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';
import type { UpgradeWebSocket, WSContext } from 'hono/ws';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join as pathJoin } from 'node:path';

/**
 * Narrow local type declarations for Bun's child-process API. We deliberately
 * avoid pulling `@types/bun` globally because it replaces the DOM `fetch`
 * signature with Bun's, breaking unrelated browser typing elsewhere in the
 * app. These shapes match Bun 1.3.x; expand as we consume more of the API.
 */
interface BunSubprocess {
  readonly stdout: ReadableStream<Uint8Array>;
  readonly stderr: ReadableStream<Uint8Array>;
  readonly exited: Promise<number>;
  kill(signal?: NodeJS.Signals | number): void;
}
interface BunSpawnOptions {
  env?: Record<string, string>;
  stdin?: 'pipe' | 'inherit' | 'ignore';
  stdout?: 'pipe' | 'inherit' | 'ignore';
  stderr?: 'pipe' | 'inherit' | 'ignore';
  cwd?: string;
}
declare const Bun: {
  spawn(command: string[], options?: BunSpawnOptions): BunSubprocess;
};

// ─── Constants ───────────────────────────────────────────────────────────────

/** Max bytes of a single stdout/stderr frame sent to the client. */
const MAX_FRAME_BYTES = 64 * 1024;

/** Hard cap on total bytes produced by one exec; prevents runaway output. */
const MAX_EXEC_OUTPUT_BYTES = 4 * 1024 * 1024;

/** Kill the child process after this many ms of wall-clock time. */
const EXEC_TIMEOUT_MS = 60_000;

/** Close an idle websocket after this many ms with no traffic. */
const IDLE_TIMEOUT_MS = 10 * 60_000;

/** Binary name. Only this binary can be invoked; argv[0] is never user-controlled. */
const DATUMCTL_BIN = 'datumctl';

/**
 * File-upload limits for the drop-to-upload feature. Uploads are staged in a
 * per-session scratch dir that the datumctl child can read via -f; this lets
 * users drop a manifest onto the embedded terminal instead of pasting YAML.
 *
 * All caps are enforced per-WS (not globally) because the WS is already
 * pinned to a single replica, so every byte we count here is memory on *this*
 * pod for *this* user's one connection.
 */
const MAX_UPLOAD_BYTES = 1 * 1024 * 1024;
/** Per-upload-chunk ceiling on the base64-encoded JSON payload. */
const MAX_UPLOAD_CHUNK_BASE64 = 192 * 1024;
/** Max simultaneous in-flight uploads per socket (drop races, retries). */
const MAX_CONCURRENT_UPLOADS = 3;
/** Abort an upload if the client stops sending chunks for this long. */
const UPLOAD_STALL_TIMEOUT_MS = 60_000;
const ALLOWED_UPLOAD_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);
const UPLOAD_ROOT = pathJoin(tmpdir(), 'datumctl-uploads');

/**
 * Subcommands that mutate auth or context state. datumctl itself rejects these
 * in ambient-token mode, but we also block them at the gateway to surface a
 * clean, consistent error message and avoid spawning a child for nothing.
 */
const DENYLISTED_SUBCOMMANDS = new Set(['login', 'logout']);

/**
 * Compound denylist — two-word forms like `ctx use` or `auth switch`.
 */
const DENYLISTED_PAIRS = new Set(['ctx use', 'auth switch', 'auth update-kubeconfig']);

// ─── Types ───────────────────────────────────────────────────────────────────

type ClientMessage =
  | { type: 'exec'; argv: string[] }
  | { type: 'cancel' }
  | { type: 'upload-begin'; id: string; name: string; size: number }
  | { type: 'upload-chunk'; id: string; data: string }
  | { type: 'upload-end'; id: string }
  | { type: 'upload-abort'; id: string };

type ServerMessage =
  | {
      type: 'ready';
      user: { email: string | null; sub: string };
      api: string;
      org: string | null;
      project: string | null;
      /**
       * Opaque per-connection identifier, included for log correlation. No
       * longer load-bearing on the upload path — everything now flows through
       * this WS — but harmless to expose and useful when grepping logs.
       */
      sessionId: string;
    }
  | { type: 'stdout'; data: string }
  | { type: 'stderr'; data: string }
  | { type: 'exit'; code: number }
  | { type: 'error'; message: string }
  | { type: 'upload-ok'; id: string; path: string; name: string; size: number }
  | { type: 'upload-error'; id: string; message: string };

/**
 * State for one in-progress upload. Bytes accumulate in `chunks` rather than
 * being streamed straight to disk: every upload is ≤1 MB so memory is cheap
 * and we get "never write a partial file" for free on failure.
 */
interface UploadState {
  safeName: string;
  declaredSize: number;
  received: number;
  chunks: Uint8Array[];
  stallTimer: ReturnType<typeof setTimeout>;
}

interface SessionState {
  userId: string;
  orgId: string | null;
  projectName: string | null;
  /** The in-flight datumctl child, if any. */
  child: BunSubprocess | null;
  /** Timestamp of the most recent message in either direction. */
  lastActivity: number;
  /** Idle-watcher timer handle. */
  idleTimer: ReturnType<typeof setInterval> | null;
  /** Bytes of output emitted by the current exec. */
  emittedBytes: number;
  /** Exec wall-clock timeout handle. */
  execTimer: ReturnType<typeof setTimeout> | null;
  /** Opaque session id; doubles as the scratch-dir name. */
  sessionId: string;
  /** Absolute path to this session's scratch dir (created lazily on first upload). */
  uploadDir: string;
  /** Uploads currently being received, keyed by client-supplied id. */
  uploads: Map<string, UploadState>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract a hostname from the API_URL env. datumctl's DATUM_API_HOSTNAME
 * expects a bare hostname (`api.datum.net`), not a URL.
 */
function apiHostname(): string {
  try {
    const u = new URL(env.public.apiUrl);
    return u.host;
  } catch {
    return env.public.apiUrl;
  }
}

/**
 * Safe JSON stringify — the protocol is trivial so this never throws, but we
 * defend against circular refs just in case someone adds a new message type.
 */
function encode(msg: ServerMessage): string {
  try {
    return JSON.stringify(msg);
  } catch {
    return JSON.stringify({ type: 'error', message: 'Internal encoding error' });
  }
}

function sendMessage(ws: WSContext, msg: ServerMessage): void {
  try {
    ws.send(encode(msg));
  } catch {
    // Peer already gone — nothing to do.
  }
}

function parseClientMessage(raw: unknown): ClientMessage | null {
  let text: string;
  if (typeof raw === 'string') text = raw;
  else if (raw instanceof ArrayBuffer) text = new TextDecoder().decode(raw);
  else return null;

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    switch (obj.type) {
      case 'cancel':
        return { type: 'cancel' };
      case 'exec': {
        if (!Array.isArray(obj.argv)) return null;
        const argv = obj.argv.filter((a): a is string => typeof a === 'string');
        if (argv.length === 0) return null;
        return { type: 'exec', argv };
      }
      case 'upload-begin': {
        if (
          typeof obj.id !== 'string' ||
          typeof obj.name !== 'string' ||
          typeof obj.size !== 'number' ||
          !Number.isFinite(obj.size)
        ) {
          return null;
        }
        return { type: 'upload-begin', id: obj.id, name: obj.name, size: obj.size };
      }
      case 'upload-chunk': {
        if (typeof obj.id !== 'string' || typeof obj.data !== 'string') return null;
        return { type: 'upload-chunk', id: obj.id, data: obj.data };
      }
      case 'upload-end': {
        if (typeof obj.id !== 'string') return null;
        return { type: 'upload-end', id: obj.id };
      }
      case 'upload-abort': {
        if (typeof obj.id !== 'string') return null;
        return { type: 'upload-abort', id: obj.id };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Denylist check. Returns a user-facing error string if the command is blocked,
 * or null if it's allowed. The denylist duplicates datumctl's own ambient
 * mutation guard so we can short-circuit without spawning a process.
 */
function denylistReason(argv: string[]): string | null {
  if (argv.length === 0) return 'Empty command';
  const first = argv[0]?.toLowerCase();
  if (!first) return 'Empty command';
  if (DENYLISTED_SUBCOMMANDS.has(first)) {
    return `\`datumctl ${first}\` is disabled inside the embedded terminal. Authentication is managed by the cloud-portal session.`;
  }
  if (argv.length >= 2) {
    const pair = `${argv[0].toLowerCase()} ${argv[1].toLowerCase()}`;
    if (DENYLISTED_PAIRS.has(pair)) {
      return `\`datumctl ${pair}\` is disabled inside the embedded terminal. Context is pinned to the current organization/project.`;
    }
  }
  return null;
}

/**
 * Build the environment for the spawned datumctl process. Inherits a minimal
 * set of vars; everything else (including the user's shell config) is stripped
 * so a misconfigured host env can't leak into the child.
 */
function buildChildEnv(params: {
  accessToken: string;
  userEmail: string | null;
  userSub: string;
  orgId: string | null;
  projectName: string | null;
}): Record<string, string> {
  const childEnv: Record<string, string> = {
    PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
    HOME: '/tmp',
    TERM: 'dumb',
    DATUMCTL_TOKEN: params.accessToken,
    DATUM_API_HOSTNAME: apiHostname(),
    DATUMCTL_USER_SUBJECT: params.userSub,
  };
  if (params.userEmail) childEnv.DATUMCTL_USER_EMAIL = params.userEmail;
  // datumctl's kubeconfig factory panics if both DATUM_PROJECT and
  // DATUM_ORGANIZATION are set, because the two select mutually-exclusive
  // contexts. When the UI has a project scope we pin to that (the API server
  // already scopes project requests under their owning org); otherwise we
  // pin to the org scope so org-level commands work.
  if (params.projectName) {
    childEnv.DATUM_PROJECT = params.projectName;
  } else if (params.orgId) {
    childEnv.DATUM_ORGANIZATION = params.orgId;
  }
  return childEnv;
}

/**
 * Stream a Bun ReadableStream (stdout or stderr) to the websocket, chunking
 * frames at MAX_FRAME_BYTES and enforcing the per-exec byte cap. Returns when
 * the stream closes or the output cap is reached.
 */
async function pumpStream(
  stream: ReadableStream<Uint8Array>,
  state: SessionState,
  ws: WSContext,
  kind: 'stdout' | 'stderr'
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      if (!value?.byteLength) continue;

      let chunk = value;
      while (chunk.byteLength > 0) {
        if (state.emittedBytes >= MAX_EXEC_OUTPUT_BYTES) {
          sendMessage(ws, {
            type: 'stderr',
            data: `\r\n[output truncated at ${MAX_EXEC_OUTPUT_BYTES} bytes]\r\n`,
          });
          try {
            state.child?.kill('SIGTERM');
          } catch {
            // Child already dead.
          }
          return;
        }

        const budget = Math.min(MAX_FRAME_BYTES, MAX_EXEC_OUTPUT_BYTES - state.emittedBytes);
        const slice = chunk.subarray(0, budget);
        chunk = chunk.subarray(slice.byteLength);
        state.emittedBytes += slice.byteLength;
        sendMessage(ws, { type: kind, data: decoder.decode(slice, { stream: true }) });
      }
    }
  } catch (err) {
    sendMessage(ws, {
      type: 'error',
      message: `Read error on ${kind}: ${(err as Error).message}`,
    });
  } finally {
    reader.releaseLock();
  }
}

/**
 * Sanitize an uploaded file's name so it's safe to use as a path segment.
 *
 * Rules:
 *   - Strip any directory components (`foo/bar.yaml` -> `bar.yaml`).
 *   - Replace anything outside `[a-zA-Z0-9._-]` with `_`. Dot-prefixed and
 *     hidden-file shenanigans are tolerated here (kept as `._foo`) because
 *     the final file is always written into a per-session UUID subdir, so
 *     there's nothing above it to traverse into.
 *   - Cap to 128 chars so an over-long name can't blow past a PATH_MAX later.
 *   - Require the basename to carry one of the allow-listed extensions.
 *
 * Returns the sanitized name, or null if the file should be rejected.
 */
function sanitizeFilename(name: string): string | null {
  const base = name.replace(/^.*[\\/]/, '');
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128);
  if (!safe || /^\.+$/.test(safe)) return null;
  const lastDot = safe.lastIndexOf('.');
  if (lastDot <= 0) return null;
  const ext = safe.slice(lastDot).toLowerCase();
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) return null;
  return safe;
}

/**
 * Best-effort teardown of a session's scratch dir. Failures are swallowed:
 * /tmp is a fallback anyway and the OS will reap it on reboot if we don't.
 */
function cleanupSessionDir(dir: string): void {
  rm(dir, { recursive: true, force: true }).catch(() => {
    // Best-effort only.
  });
}

/**
 * Drop an in-progress upload from the session, releasing its stall timer and
 * freeing the in-memory buffer for GC. Safe to call on an unknown id.
 */
function abortUpload(state: SessionState, id: string): void {
  const upload = state.uploads.get(id);
  if (!upload) return;
  clearTimeout(upload.stallTimer);
  state.uploads.delete(id);
}

/**
 * Concatenate the chunks of a completed upload into a single Uint8Array.
 * Pulled out so the happy path stays readable; allocating the destination
 * up-front lets the runtime pick one contiguous allocation instead of the
 * grow-and-copy dance `Buffer.concat` would do.
 */
function assembleUpload(chunks: readonly Uint8Array[], totalLen: number): Uint8Array {
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * Decode a base64 string to Uint8Array. Uses atob + byte-array mapping; Node
 * and Bun both provide atob globally. Throws on invalid base64 so the caller
 * can surface an upload-error.
 */
function decodeBase64(data: string): Uint8Array {
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Handle an `upload-begin` frame. Validates the declared size + filename,
 * registers the upload in session state, and arms a stall timer so an
 * abandoned upload doesn't sit in memory until the socket idle-timeouts.
 */
function handleUploadBegin(
  state: SessionState,
  ws: WSContext,
  msg: Extract<ClientMessage, { type: 'upload-begin' }>
): void {
  if (state.uploads.has(msg.id)) {
    sendMessage(ws, {
      type: 'upload-error',
      id: msg.id,
      message: 'Upload id already in use.',
    });
    return;
  }
  if (state.uploads.size >= MAX_CONCURRENT_UPLOADS) {
    sendMessage(ws, {
      type: 'upload-error',
      id: msg.id,
      message: `Too many concurrent uploads (max ${MAX_CONCURRENT_UPLOADS}).`,
    });
    return;
  }
  if (msg.size <= 0 || msg.size > MAX_UPLOAD_BYTES) {
    sendMessage(ws, {
      type: 'upload-error',
      id: msg.id,
      message: `File size must be between 1 and ${MAX_UPLOAD_BYTES} bytes.`,
    });
    return;
  }
  const safeName = sanitizeFilename(msg.name);
  if (!safeName) {
    sendMessage(ws, {
      type: 'upload-error',
      id: msg.id,
      message: 'Only .yaml, .yml, or .json files are allowed.',
    });
    return;
  }

  const stallTimer = setTimeout(() => {
    if (!state.uploads.has(msg.id)) return;
    abortUpload(state, msg.id);
    sendMessage(ws, {
      type: 'upload-error',
      id: msg.id,
      message: `Upload stalled (no chunks for ${UPLOAD_STALL_TIMEOUT_MS / 1000}s).`,
    });
  }, UPLOAD_STALL_TIMEOUT_MS);

  state.uploads.set(msg.id, {
    safeName,
    declaredSize: msg.size,
    received: 0,
    chunks: [],
    stallTimer,
  });
}

/**
 * Handle an `upload-chunk` frame. Decodes base64, enforces per-chunk and
 * per-upload size caps, and appends to the in-progress buffer. Any overrun
 * tears the upload down so the socket never buffers more than we promised.
 */
function handleUploadChunk(
  state: SessionState,
  ws: WSContext,
  msg: Extract<ClientMessage, { type: 'upload-chunk' }>
): void {
  const upload = state.uploads.get(msg.id);
  if (!upload) {
    sendMessage(ws, {
      type: 'upload-error',
      id: msg.id,
      message: 'Unknown upload id. Did the session restart?',
    });
    return;
  }
  if (msg.data.length > MAX_UPLOAD_CHUNK_BASE64) {
    abortUpload(state, msg.id);
    sendMessage(ws, {
      type: 'upload-error',
      id: msg.id,
      message: 'Upload chunk too large.',
    });
    return;
  }

  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(msg.data);
  } catch {
    abortUpload(state, msg.id);
    sendMessage(ws, {
      type: 'upload-error',
      id: msg.id,
      message: 'Malformed upload chunk (not valid base64).',
    });
    return;
  }
  if (bytes.byteLength === 0) return;

  const nextReceived = upload.received + bytes.byteLength;
  if (nextReceived > upload.declaredSize || nextReceived > MAX_UPLOAD_BYTES) {
    abortUpload(state, msg.id);
    sendMessage(ws, {
      type: 'upload-error',
      id: msg.id,
      message: 'Upload exceeded declared size.',
    });
    return;
  }

  upload.chunks.push(bytes);
  upload.received = nextReceived;

  // Each chunk resets the stall timer so a legitimately slow client can keep
  // uploading; only true inactivity ages the upload out.
  clearTimeout(upload.stallTimer);
  upload.stallTimer = setTimeout(() => {
    if (!state.uploads.has(msg.id)) return;
    abortUpload(state, msg.id);
    sendMessage(ws, {
      type: 'upload-error',
      id: msg.id,
      message: `Upload stalled (no chunks for ${UPLOAD_STALL_TIMEOUT_MS / 1000}s).`,
    });
  }, UPLOAD_STALL_TIMEOUT_MS);
}

/**
 * Handle an `upload-end` frame. Writes the assembled buffer to the session's
 * scratch dir (created lazily here so sessions with no uploads leave nothing
 * behind on disk) and replies with the absolute path datumctl can consume.
 */
async function handleUploadEnd(state: SessionState, ws: WSContext, id: string): Promise<void> {
  const upload = state.uploads.get(id);
  if (!upload) {
    sendMessage(ws, {
      type: 'upload-error',
      id,
      message: 'Unknown upload id.',
    });
    return;
  }
  clearTimeout(upload.stallTimer);
  if (upload.received !== upload.declaredSize) {
    state.uploads.delete(id);
    sendMessage(ws, {
      type: 'upload-error',
      id,
      message: `Upload incomplete (received ${upload.received} of ${upload.declaredSize} bytes).`,
    });
    return;
  }

  try {
    await mkdir(state.uploadDir, { recursive: true });
    const fullPath = pathJoin(state.uploadDir, upload.safeName);
    const buf = assembleUpload(upload.chunks, upload.received);
    await writeFile(fullPath, buf);
    state.uploads.delete(id);
    sendMessage(ws, {
      type: 'upload-ok',
      id,
      path: fullPath,
      name: upload.safeName,
      size: buf.byteLength,
    });
  } catch (err) {
    state.uploads.delete(id);
    sendMessage(ws, {
      type: 'upload-error',
      id,
      message: `Failed to stage upload: ${(err as Error).message}`,
    });
  }
}

/**
 * Release every in-progress upload's timer and buffer. Called when the WS
 * closes so a stalled upload can't outlive the connection that owns it.
 */
function resetUploads(state: SessionState): void {
  for (const upload of state.uploads.values()) {
    clearTimeout(upload.stallTimer);
  }
  state.uploads.clear();
}

/**
 * Kill and forget any running child for this session, releasing timers.
 */
function resetExec(state: SessionState): void {
  if (state.execTimer) {
    clearTimeout(state.execTimer);
    state.execTimer = null;
  }
  if (state.child) {
    try {
      state.child.kill('SIGTERM');
    } catch {
      // Already dead.
    }
    state.child = null;
  }
  state.emittedBytes = 0;
}

// ─── Route factory ───────────────────────────────────────────────────────────

/**
 * Build the /api/terminal sub-app. Accepts `upgradeWebSocket` from the runtime
 * adapter so the same factory works under Bun (production) and Vite's Node
 * dev server.
 */
export function createTerminalRoutes(
  upgradeWebSocket: UpgradeWebSocket
): Hono<{ Variables: Variables }> {
  const app = new Hono<{ Variables: Variables }>();

  /**
   * GET /api/terminal/ws?orgId=...&projectName=...
   *
   * Auth: authGuardMiddleware (applied by the parent api sub-app) ensures a
   * session exists. We re-read it here because the websocket upgrade runs
   * outside the normal request/response cycle and we need the token for env.
   */
  app.get(
    '/ws',
    upgradeWebSocket((c) => {
      const session = c.get('session');
      const requestId = c.get('requestId');
      const orgId = c.req.query('orgId') || null;
      const projectName = c.req.query('projectName') || null;

      // The embedded terminal is gated on DATUMCTL_BIN being set. We can't
      // return a 501 from inside the upgrade handler (it would already be an
      // open WS by then), so we send an error frame and close.
      const datumctlBin = env.server.datumctlBin;

      const sessionId = randomUUID();
      const uploadDir = pathJoin(UPLOAD_ROOT, sessionId);

      const state: SessionState = {
        userId: session?.sub ?? 'anonymous',
        orgId,
        projectName,
        child: null,
        lastActivity: Date.now(),
        idleTimer: null,
        emittedBytes: 0,
        execTimer: null,
        sessionId,
        uploadDir,
        uploads: new Map(),
      };

      return {
        onOpen(_evt, ws) {
          if (!session) {
            sendMessage(ws, { type: 'error', message: 'Unauthorized' });
            ws.close(4401, 'unauthorized');
            return;
          }
          if (!datumctlBin) {
            sendMessage(ws, {
              type: 'error',
              message: 'Embedded terminal is not configured on this server (DATUMCTL_BIN unset).',
            });
            ws.close(4501, 'terminal-disabled');
            return;
          }

          // Idle watchdog — closes the socket if neither side talks for a while.
          state.idleTimer = setInterval(() => {
            if (Date.now() - state.lastActivity > IDLE_TIMEOUT_MS) {
              sendMessage(ws, { type: 'error', message: 'Idle timeout' });
              ws.close(4000, 'idle-timeout');
            }
          }, 30_000);

          sendMessage(ws, {
            type: 'ready',
            user: { email: null, sub: session.sub },
            api: apiHostname(),
            org: orgId,
            project: projectName,
            sessionId: state.sessionId,
          });
        },

        onMessage(evt, ws) {
          state.lastActivity = Date.now();
          if (!session || !datumctlBin) return;

          const msg = parseClientMessage(evt.data);
          if (!msg) {
            sendMessage(ws, { type: 'error', message: 'Malformed message' });
            return;
          }

          if (msg.type === 'cancel') {
            if (state.child) {
              try {
                state.child.kill('SIGINT');
              } catch {
                // Already gone.
              }
            }
            return;
          }

          if (msg.type === 'upload-begin') {
            handleUploadBegin(state, ws, msg);
            return;
          }
          if (msg.type === 'upload-chunk') {
            handleUploadChunk(state, ws, msg);
            return;
          }
          if (msg.type === 'upload-end') {
            void handleUploadEnd(state, ws, msg.id);
            return;
          }
          if (msg.type === 'upload-abort') {
            abortUpload(state, msg.id);
            return;
          }

          // msg.type === 'exec'
          if (state.child) {
            sendMessage(ws, {
              type: 'error',
              message: 'Another command is already running. Press Ctrl-C to cancel it.',
            });
            return;
          }

          const reason = denylistReason(msg.argv);
          if (reason) {
            sendMessage(ws, { type: 'stderr', data: `${reason}\r\n` });
            sendMessage(ws, { type: 'exit', code: 1 });
            return;
          }

          const childEnv = buildChildEnv({
            accessToken: session.accessToken,
            userEmail: null,
            userSub: session.sub,
            orgId: state.orgId,
            projectName: state.projectName,
          });

          let child: BunSubprocess;
          try {
            child = Bun.spawn([datumctlBin, ...msg.argv], {
              env: childEnv,
              stdin: 'ignore',
              stdout: 'pipe',
              stderr: 'pipe',
              cwd: '/tmp',
            });
          } catch (err) {
            sendMessage(ws, {
              type: 'error',
              message: `Failed to start datumctl: ${(err as Error).message}`,
            });
            return;
          }

          state.child = child;
          state.emittedBytes = 0;
          state.execTimer = setTimeout(() => {
            sendMessage(ws, {
              type: 'stderr',
              data: `\r\n[timeout after ${EXEC_TIMEOUT_MS / 1000}s — killing process]\r\n`,
            });
            try {
              child.kill('SIGTERM');
            } catch {
              // Already gone.
            }
          }, EXEC_TIMEOUT_MS);

          // Pump stdout and stderr in parallel; wait on exit.
          void Promise.all([
            pumpStream(child.stdout as ReadableStream<Uint8Array>, state, ws, 'stdout'),
            pumpStream(child.stderr as ReadableStream<Uint8Array>, state, ws, 'stderr'),
            child.exited,
          ])
            .then(([, , code]) => {
              if (state.execTimer) {
                clearTimeout(state.execTimer);
                state.execTimer = null;
              }
              state.child = null;
              sendMessage(ws, { type: 'exit', code: typeof code === 'number' ? code : 0 });
            })
            .catch((err: unknown) => {
              if (state.execTimer) {
                clearTimeout(state.execTimer);
                state.execTimer = null;
              }
              state.child = null;
              sendMessage(ws, {
                type: 'error',
                message: `Process error: ${(err as Error).message}`,
              });
              sendMessage(ws, { type: 'exit', code: 1 });
            });
        },

        onClose() {
          if (state.idleTimer) {
            clearInterval(state.idleTimer);
            state.idleTimer = null;
          }
          resetExec(state);
          resetUploads(state);
          cleanupSessionDir(state.uploadDir);
        },

        onError(_evt, ws) {
          // Log via request-scoped id so we can correlate if it happens.
          console.error(`[terminal] websocket error rid=${requestId} user=${state.userId}`);
          resetExec(state);
          resetUploads(state);
          cleanupSessionDir(state.uploadDir);
          try {
            ws.close(1011, 'internal-error');
          } catch {
            // Already gone.
          }
        },
      };
    })
  );

  return app;
}
