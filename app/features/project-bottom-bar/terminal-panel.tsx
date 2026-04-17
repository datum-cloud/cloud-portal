/**
 * Developer Tools → Terminal panel.
 *
 * Renders an xterm.js terminal bound to /api/terminal/ws, which brokers a
 * server-side `datumctl` session pre-wired with the signed-in user's access
 * token and the current org/project context. The terminal is "line-mode" (not
 * a PTY): the client handles line editing locally and ships each command as a
 * JSON `exec` frame, then streams the child's stdout/stderr back into the
 * buffer. This avoids needing a real pseudo-terminal on the server while
 * still feeling like a CLI.
 */
import { useProjectContext } from '@/providers/project.provider';
import { useTerminalSession } from '@/providers/terminal-session.provider';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Theming helpers ─────────────────────────────────────────────────────────

/** Resolves a CSS variable to an rgb() string xterm can consume. */
function resolveCSSVar(variable: string): string {
  const el = document.createElement('div');
  el.style.color = `hsl(${getComputedStyle(document.documentElement).getPropertyValue(variable).trim()})`;
  document.body.appendChild(el);
  const resolved = getComputedStyle(el).color;
  document.body.removeChild(el);
  return resolved;
}

const foreground = resolveCSSVar('--foreground');
const muted = resolveCSSVar('--muted');
const primary = resolveCSSVar('--primary');
const destructive = resolveCSSVar('--destructive');

function toAnsi(rgb: string, bold = false): string {
  const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
  return `\x1b[${bold ? '1;' : ''}38;2;${r};${g};${b}m`;
}

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  primary: toAnsi(primary, true),
  error: toAnsi(destructive, true),
} as const;

const WELCOME = [
  '',
  `${ANSI.primary}    ____  ___  ________  ____  ___ ${ANSI.reset}`,
  `${ANSI.primary}   / __ \\/   |/_  __/ / / /  |/  / ${ANSI.reset}`,
  `${ANSI.primary}  / / / / /| | / / / / / / /|_/ /  ${ANSI.reset}`,
  `${ANSI.primary} / /_/ / ___ |/ / / /_/ / /  / /   ${ANSI.reset}`,
  `${ANSI.primary}/_____/_/  |_/_/  \\____/_/  /_/    ${ANSI.reset}`,
  '',
  `${ANSI.dim}Manage your Datum Cloud resources via the embedded datumctl CLI.${ANSI.reset}`,
  `${ANSI.dim}Authentication and context (organization/project) are pinned to the current session.${ANSI.reset}`,
  '',
  '',
].join('\r\n');

// ─── Protocol ────────────────────────────────────────────────────────────────

type ServerMessage =
  | {
      type: 'ready';
      user: { email: string | null; sub: string };
      api: string;
      org: string | null;
      project: string | null;
      sessionId: string;
    }
  | { type: 'stdout'; data: string }
  | { type: 'stderr'; data: string }
  | { type: 'exit'; code: number }
  | { type: 'error'; message: string }
  | { type: 'upload-ok'; id: string; path: string; name: string; size: number }
  | { type: 'upload-error'; id: string; message: string };

// ─── Upload constraints (mirror of server-side limits) ──────────────────────
// Kept in sync manually with app/server/routes/terminal.ts. Client-side
// validation is purely for UX — the server repeats every check.
const MAX_UPLOAD_BYTES = 1 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = ['.yaml', '.yml', '.json'] as const;
/**
 * Bytes per outgoing chunk (raw, pre-base64). 96 KiB → ~128 KiB after base64
 * → fits comfortably under the server's 192 KiB per-chunk envelope cap with
 * headroom for the JSON wrapper.
 */
const UPLOAD_CHUNK_BYTES = 96 * 1024;

type ClientMessage =
  | { type: 'exec'; argv: string[] }
  | { type: 'cancel' }
  | { type: 'upload-begin'; id: string; name: string; size: number }
  | { type: 'upload-chunk'; id: string; data: string }
  | { type: 'upload-end'; id: string }
  | { type: 'upload-abort'; id: string };

/**
 * Convert a Uint8Array to base64. Built-ins all round-trip through a binary
 * string, which is fine at 96 KiB/chunk (our slicing limit); anything bigger
 * would start hitting String.fromCharCode argument-limit footguns and want
 * chunked conversion instead.
 */
function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// ─── Tiny shell-ish argv splitter ────────────────────────────────────────────

/**
 * Parse a command line into argv. Supports single/double quotes and backslash
 * escapes inside double quotes. Deliberately much simpler than a real shell —
 * we don't want variable expansion, globbing, pipes, or substitutions leaking
 * into an ambient-token child process.
 */
function splitArgv(line: string): string[] {
  const argv: string[] = [];
  let current = '';
  let i = 0;
  let quote: '"' | "'" | null = null;

  while (i < line.length) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\' && quote === '"' && i + 1 < line.length) {
        current += line[i + 1];
        i += 2;
        continue;
      }
      if (ch === quote) {
        quote = null;
        i += 1;
        continue;
      }
      current += ch;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      i += 1;
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      if (current.length > 0) {
        argv.push(current);
        current = '';
      }
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  if (current.length > 0) argv.push(current);
  return argv;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TerminalPanel() {
  const { org, project } = useProjectContext();
  const { setActive: setSessionActive, registerCloser } = useTerminalSession();

  const fitAddon = useRef(new FitAddon());
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const hasWrittenWelcome = useRef(false);
  // Tracks whether this is the very first mount of the component (as opposed
  // to an Activity show after hide). Used to clear any stale "session active"
  // flag inherited from a previous project's TerminalPanel instance.
  const isFirstMount = useRef(true);
  // Records the (org, project) pair that the currently-open socket was
  // spawned against. When the parent context changes (user switched project
  // or org), we compare and — on mismatch — silently close the old socket
  // and open a fresh one wired to the new context. Without this the visible
  // terminal would keep running against the previous project's ambient env.
  const connectedContextRef = useRef<{ org: string | null; project: string | null } | null>(null);

  // Line editor state. Kept in refs rather than React state so xterm's data
  // callback can read/write without triggering re-renders on every keypress.
  const bufferRef = useRef('');
  const cursorRef = useRef(0);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number | null>(null);
  const executingRef = useRef(false);
  const connectedRef = useRef(false);

  // Upload bookkeeping. sessionId is kept for log correlation only — uploads
  // themselves now ride on this WS so there's no cross-replica routing to
  // worry about. `isDragging` is the one bit of state that needs to
  // re-render (to toggle the overlay); everything else is a ref to keep the
  // input hot-path fast.
  const sessionIdRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Counter rather than boolean because dragenter/dragleave fire for every
  // child element we cross. We only want to unshow the overlay when leaves
  // exceed enters (i.e. the cursor has truly left the container).
  const dragDepthRef = useRef(0);
  // Open uploads are keyed by the id we generate per drop; the server echoes
  // the id back on upload-ok/upload-error so we can route the response to the
  // right pending promise even if two drops race.
  const pendingUploadsRef = useRef(
    new Map<
      string,
      {
        resolve: (result: { path: string; name: string; size: number }) => void;
        reject: (err: Error) => void;
      }
    >()
  );

  // ─── Terminal output helpers ──────────────────────────────────────────────

  const writeLine = useCallback((text: string) => {
    terminalRef.current?.writeln(text);
  }, []);

  const writePrompt = useCallback(() => {
    const term = terminalRef.current;
    if (!term) return;
    // Prefer human-readable display names; fall back to the k8s resource name
    // (which is what datumctl itself needs as context) if no display name has
    // been set yet.
    const orgLabel = org?.displayName || org?.name || '—';
    const projLabel = project?.displayName || project?.name || null;
    const ctx = projLabel ? `${orgLabel}/${projLabel}` : orgLabel;
    term.write(`${ANSI.dim}[${ctx}]${ANSI.reset} ${ANSI.primary}datumctl›${ANSI.reset} `);
  }, [org, project]);

  const resetLineBuffer = useCallback(() => {
    bufferRef.current = '';
    cursorRef.current = 0;
    historyIndexRef.current = null;
  }, []);

  // Redraw the current input line from scratch — the cheapest way to keep the
  // visual in sync with the buffer after arbitrary edits (history nav, etc.).
  const redrawLine = useCallback(() => {
    const term = terminalRef.current;
    if (!term) return;
    // Clear from cursor to end of line, then backspace to the start of input.
    term.write('\r\x1b[2K');
    writePrompt();
    term.write(bufferRef.current);
    // Reposition cursor if it's not at the end.
    const trailing = bufferRef.current.length - cursorRef.current;
    if (trailing > 0) term.write(`\x1b[${trailing}D`);
  }, [writePrompt]);

  // Print a status line above the current prompt+buffer without disturbing
  // what the user was typing. Used by the upload flow to report success or
  // errors while the user is mid-command.
  const printAboveInput = useCallback(
    (text: string) => {
      const term = terminalRef.current;
      if (!term) return;
      // Wipe whatever the user has on-screen for the current prompt so the
      // status line renders flush to column zero rather than getting
      // appended after "datumctl apply -f █".
      term.write('\r\x1b[2K');
      term.writeln(text);
      redrawLine();
    },
    [redrawLine]
  );

  // Programmatically inject text at the current cursor position. The onData
  // handler already has per-key insert logic; we duplicate the bookkeeping
  // here rather than going through `term.paste()` so that accidental control
  // chars in the input can't ever trip the Enter/Ctrl-C branches.
  const insertText = useCallback(
    (text: string) => {
      const term = terminalRef.current;
      if (!term || !connectedRef.current || executingRef.current) return;
      const clean = text.replace(/[\r\n\x00-\x1f]/g, '');
      if (!clean) return;
      const before = bufferRef.current.slice(0, cursorRef.current);
      const after = bufferRef.current.slice(cursorRef.current);
      bufferRef.current = before + clean + after;
      cursorRef.current += clean.length;
      if (after.length === 0) {
        term.write(clean);
      } else {
        redrawLine();
      }
    },
    [redrawLine]
  );

  // ─── WebSocket wiring ─────────────────────────────────────────────────────

  const sendMessage = useCallback((msg: ClientMessage) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(msg));
  }, []);

  const handleServerMessage = useCallback(
    (msg: ServerMessage) => {
      const term = terminalRef.current;
      if (!term) return;

      switch (msg.type) {
        case 'ready': {
          connectedRef.current = true;
          sessionIdRef.current = msg.sessionId;
          // The prompt already carries the current org/project; no need to
          // echo it again on connect.
          writePrompt();
          return;
        }
        case 'stdout':
        case 'stderr': {
          // The server sends raw child output; datumctl emits LF-terminated
          // lines, but xterm expects CRLF to move the cursor back to column 0.
          const normalized = msg.data.replace(/(?<!\r)\n/g, '\r\n');
          term.write(normalized);
          return;
        }
        case 'exit': {
          executingRef.current = false;
          // Ensure we're on a fresh line before the next prompt, without
          // printing a blank row when the child already ended with a newline.
          term.write('\r\n');
          if (msg.code !== 0) {
            writeLine(`${ANSI.error}exit code ${msg.code}${ANSI.reset}`);
          }
          resetLineBuffer();
          writePrompt();
          return;
        }
        case 'error': {
          executingRef.current = false;
          writeLine(`${ANSI.error}${msg.message}${ANSI.reset}`);
          resetLineBuffer();
          if (connectedRef.current) writePrompt();
          return;
        }
        case 'upload-ok': {
          const pending = pendingUploadsRef.current.get(msg.id);
          if (!pending) return;
          pendingUploadsRef.current.delete(msg.id);
          pending.resolve({ path: msg.path, name: msg.name, size: msg.size });
          return;
        }
        case 'upload-error': {
          const pending = pendingUploadsRef.current.get(msg.id);
          if (!pending) return;
          pendingUploadsRef.current.delete(msg.id);
          pending.reject(new Error(msg.message));
          return;
        }
      }
    },
    [resetLineBuffer, writeLine, writePrompt]
  );

  const connect = useCallback(() => {
    const term = terminalRef.current;
    if (!term || socketRef.current) return;

    const targetOrg = org?.name ?? null;
    const targetProject = project?.name ?? null;

    const url = new URL('/api/terminal/ws', window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    if (targetOrg) url.searchParams.set('orgId', targetOrg);
    if (targetProject) url.searchParams.set('projectName', targetProject);

    let ws: WebSocket;
    try {
      ws = new WebSocket(url.toString());
    } catch (err) {
      writeLine(`${ANSI.error}Failed to open terminal: ${(err as Error).message}${ANSI.reset}`);
      return;
    }
    socketRef.current = ws;
    connectedContextRef.current = { org: targetOrg, project: targetProject };

    // We use property-assignment handlers (not addEventListener) so the
    // context-change effect can silently detach them before close()-ing
    // the stale socket, without its teardown bleeding into the fresh
    // session's output.

    // Flag the session as live the moment the handshake completes. Publishes
    // "terminal is running" to the app so context-switch UIs can prompt
    // before tearing it down.
    ws.onopen = () => {
      setSessionActive(true);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(typeof evt.data === 'string' ? evt.data : '') as ServerMessage;
        handleServerMessage(msg);
      } catch {
        // Ignore malformed frames — defensive, server shouldn't send any.
      }
    };

    ws.onclose = (evt) => {
      connectedRef.current = false;
      socketRef.current = null;
      executingRef.current = false;
      connectedContextRef.current = null;
      sessionIdRef.current = null;
      // Any upload mid-flight is toast now that the server state is gone;
      // fail fast so the drop's promise chain surfaces an error rather than
      // hanging until the user tries something else.
      for (const { reject } of pendingUploadsRef.current.values()) {
        reject(new Error('Terminal disconnected'));
      }
      pendingUploadsRef.current.clear();
      setSessionActive(false);
      const reason = evt.reason || 'connection closed';
      writeLine('');
      writeLine(`${ANSI.dim}— ${reason} —${ANSI.reset}`);
    };

    ws.onerror = () => {
      // Details come through the subsequent close event; nothing to do here.
    };
  }, [handleServerMessage, org?.name, project?.name, setSessionActive, writeLine]);

  // ─── File drop → upload ───────────────────────────────────────────────────

  // Upload a dropped manifest over the current WebSocket and paste the
  // returned absolute server path into the input buffer. Tunneling through
  // the already-open WS (rather than a sibling HTTP POST) keeps the bytes
  // and the datumctl child pinned to the same replica, which matters the
  // moment the cloud-portal runs with more than one pod behind a
  // round-robin load balancer.
  const uploadFile = useCallback(
    async (file: File) => {
      if (!connectedRef.current) {
        printAboveInput(`${ANSI.error}Terminal is not connected.${ANSI.reset}`);
        return;
      }
      if (executingRef.current) {
        printAboveInput(
          `${ANSI.error}Wait for the running command to finish before uploading.${ANSI.reset}`
        );
        return;
      }

      // Client-side pre-validation — purely for snappier feedback; the server
      // repeats every check because a malicious client could skip these.
      const lower = file.name.toLowerCase();
      if (!ALLOWED_UPLOAD_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        printAboveInput(
          `${ANSI.error}Only ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')} files can be uploaded.${ANSI.reset}`
        );
        return;
      }
      if (file.size === 0) {
        printAboveInput(`${ANSI.error}File "${file.name}" is empty.${ANSI.reset}`);
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        printAboveInput(
          `${ANSI.error}File too large (max ${Math.floor(MAX_UPLOAD_BYTES / 1024)} KB).${ANSI.reset}`
        );
        return;
      }

      // Pull the whole file into memory once. At 1 MB cap this is fine and
      // avoids any FileReader streaming dance; if we ever raise the cap
      // materially we should switch to `file.stream()`.
      let buffer: ArrayBuffer;
      try {
        buffer = await file.arrayBuffer();
      } catch (err) {
        printAboveInput(`${ANSI.error}Read failed: ${(err as Error).message}${ANSI.reset}`);
        return;
      }
      const bytes = new Uint8Array(buffer);

      const id = crypto.randomUUID();
      const result = new Promise<{ path: string; name: string; size: number }>(
        (resolve, reject) => {
          pendingUploadsRef.current.set(id, { resolve, reject });
        }
      );

      // Send begin → chunks → end. Each frame goes straight to the server
      // via the same socket that serves stdout/stderr, so ordering is
      // guaranteed and no extra routing is involved.
      sendMessage({ type: 'upload-begin', id, name: file.name, size: bytes.byteLength });
      printAboveInput(`${ANSI.dim}Uploading ${file.name}…${ANSI.reset}`);
      try {
        for (let offset = 0; offset < bytes.byteLength; offset += UPLOAD_CHUNK_BYTES) {
          const slice = bytes.subarray(offset, offset + UPLOAD_CHUNK_BYTES);
          sendMessage({ type: 'upload-chunk', id, data: bytesToBase64(slice) });
        }
        sendMessage({ type: 'upload-end', id });
      } catch (err) {
        pendingUploadsRef.current.delete(id);
        // Best-effort abort — if the socket's already dead the server won't
        // see it but the dead session cleanup will GC the partial anyway.
        sendMessage({ type: 'upload-abort', id });
        printAboveInput(`${ANSI.error}Upload send failed: ${(err as Error).message}${ANSI.reset}`);
        return;
      }

      let done: { path: string; name: string; size: number };
      try {
        done = await result;
      } catch (err) {
        printAboveInput(`${ANSI.error}Upload failed: ${(err as Error).message}${ANSI.reset}`);
        return;
      }

      printAboveInput(`${ANSI.dim}Uploaded ${done.name} (${done.size} bytes)${ANSI.reset}`);
      // Nudge the buffer with a leading space if it doesn't already end in
      // whitespace so `datumctl apply -f` + drop → the -f flag and path
      // aren't smashed together.
      const needsSpace = bufferRef.current.length > 0 && !/\s$/.test(bufferRef.current);
      insertText((needsSpace ? ' ' : '') + done.path);
    },
    [insertText, printAboveInput, sendMessage]
  );

  // ─── Terminal lifecycle ───────────────────────────────────────────────────

  // Callback ref: creates the terminal once when the div is first attached to
  // the DOM. Using a callback ref (not useEffect) means Activity's effect
  // cleanup cycle never disposes the terminal — the instance survives
  // hide/show without losing its buffer.
  const xtermDivRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || terminalRef.current) return;
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'monospace',
      allowTransparency: true,
      convertEol: false,
      scrollback: 2000,
      theme: {
        background: 'rgba(0, 0, 0, 0)',
        foreground,
        cursor: foreground,
        cursorAccent: muted,
      },
    });
    terminal.loadAddon(fitAddon.current);
    terminal.open(node);
    terminalRef.current = terminal;
  }, []);

  // Input handler — re-registers on every render but that's cheap; the data
  // callback itself closes over refs, so no stale state issues.
  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;

    const disposable = term.onData((data) => {
      if (!connectedRef.current) return;

      // A command is running — forward Ctrl-C as cancel, swallow everything
      // else so we don't spam the server or stray-write into the output.
      if (executingRef.current) {
        if (data === '\x03') sendMessage({ type: 'cancel' });
        return;
      }

      for (let i = 0; i < data.length; i += 1) {
        const ch = data[i];
        const code = ch.charCodeAt(0);

        // Escape sequences (arrow keys, etc.) arrive as a single chunk.
        if (ch === '\x1b' && data.length >= 3 && data[i + 1] === '[') {
          const seq = data[i + 2];
          if (seq === 'A') {
            // Up arrow — previous history entry.
            const h = historyRef.current;
            if (h.length === 0) {
              i += 2;
              continue;
            }
            const next =
              historyIndexRef.current === null
                ? h.length - 1
                : Math.max(0, historyIndexRef.current - 1);
            historyIndexRef.current = next;
            bufferRef.current = h[next] ?? '';
            cursorRef.current = bufferRef.current.length;
            redrawLine();
            i += 2;
            continue;
          }
          if (seq === 'B') {
            // Down arrow — next history entry (or empty if past the newest).
            const h = historyRef.current;
            if (historyIndexRef.current === null) {
              i += 2;
              continue;
            }
            const next = historyIndexRef.current + 1;
            if (next >= h.length) {
              historyIndexRef.current = null;
              bufferRef.current = '';
            } else {
              historyIndexRef.current = next;
              bufferRef.current = h[next] ?? '';
            }
            cursorRef.current = bufferRef.current.length;
            redrawLine();
            i += 2;
            continue;
          }
          if (seq === 'C') {
            // Right arrow.
            if (cursorRef.current < bufferRef.current.length) {
              cursorRef.current += 1;
              term.write('\x1b[C');
            }
            i += 2;
            continue;
          }
          if (seq === 'D') {
            // Left arrow.
            if (cursorRef.current > 0) {
              cursorRef.current -= 1;
              term.write('\x1b[D');
            }
            i += 2;
            continue;
          }
          // Unknown escape sequence — skip the CSI introducer and move on.
          i += 2;
          continue;
        }

        if (ch === '\x03') {
          // Ctrl-C with no running process: abandon the line, new prompt.
          term.write('^C\r\n');
          resetLineBuffer();
          writePrompt();
          continue;
        }

        if (ch === '\r' || ch === '\n') {
          const line = bufferRef.current.trim();
          term.write('\r\n');
          if (!line) {
            resetLineBuffer();
            writePrompt();
            continue;
          }
          const argv = splitArgv(line);
          if (argv[0] === 'clear') {
            term.clear();
            historyRef.current.push(line);
            resetLineBuffer();
            writePrompt();
            continue;
          }
          historyRef.current.push(line);
          if (historyRef.current.length > 200) historyRef.current.shift();
          resetLineBuffer();
          executingRef.current = true;
          sendMessage({ type: 'exec', argv });
          continue;
        }

        if (code === 127 || code === 8) {
          // Backspace.
          if (cursorRef.current === 0) continue;
          const before = bufferRef.current.slice(0, cursorRef.current - 1);
          const after = bufferRef.current.slice(cursorRef.current);
          bufferRef.current = before + after;
          cursorRef.current -= 1;
          redrawLine();
          continue;
        }

        if (code < 0x20) {
          // Ignore other control chars we don't handle.
          continue;
        }

        // Insert printable character at the cursor position.
        const before = bufferRef.current.slice(0, cursorRef.current);
        const after = bufferRef.current.slice(cursorRef.current);
        bufferRef.current = before + ch + after;
        cursorRef.current += 1;
        if (after.length === 0) {
          term.write(ch);
        } else {
          redrawLine();
        }
      }
    });

    return () => disposable.dispose();
  });

  // Fit on first visible resize; write welcome once; connect.
  useEffect(() => {
    const el = containerRef.current;
    const terminal = terminalRef.current;
    if (!el || !terminal) return;
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) {
        fitAddon.current.fit();
        if (!hasWrittenWelcome.current) {
          hasWrittenWelcome.current = true;
          terminal.write(WELCOME);
          connect();
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  });

  // Silently close the current socket and reset terminal state. Used by
  // both the context-change effect (which reconnects after) and the
  // provider-registered closer (which does NOT reconnect — it's the bar
  // close / logout / account-settings path). Handlers are detached before
  // close() so the old socket's teardown can't leak "connection closed"
  // into any fresh buffer we render afterwards.
  const tearDownSession = useCallback(
    (reason: string) => {
      const ws = socketRef.current;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        try {
          ws.close(1000, reason);
        } catch {
          // close() can throw if the socket never reached OPEN; ignore —
          // we only care about ensuring the server side is torn down.
        }
      }
      socketRef.current = null;
      connectedContextRef.current = null;
      connectedRef.current = false;
      executingRef.current = false;
      sessionIdRef.current = null;
      for (const { reject } of pendingUploadsRef.current.values()) {
        reject(new Error('Terminal closed'));
      }
      pendingUploadsRef.current.clear();
      setSessionActive(false);
      resetLineBuffer();
      // `reset()` does a full RIS (ESC c), wiping the buffer, scrollback,
      // and cursor state. `clear()` alone would leave the stale prompt
      // line from the previous context as the new first line.
      terminalRef.current?.reset();
      hasWrittenWelcome.current = false;
    },
    [resetLineBuffer, setSessionActive]
  );

  // Register a closer so the provider can imperatively tear this session
  // down when the user confirms a "close terminal" action (bar collapse,
  // logout, Account Settings). Clearing on unmount keeps `closeSession()`
  // a no-op after we're gone.
  useEffect(() => {
    registerCloser(() => tearDownSession('client-close'));
    return () => registerCloser(null);
  }, [registerCloser, tearDownSession]);

  // React to org/project changes after the initial connection is up. The
  // project layout stays mounted across project switches, so without this
  // the xterm buffer + socket would keep pointing at the previous context.
  //
  // Reconnect lazily: if the terminal panel isn't currently on screen (the
  // user is looking at Chat / Docs, or the bottom bar is collapsed) we tear
  // the old session down but don't open a fresh WebSocket until the panel
  // becomes visible again. The ResizeObserver below picks it up once the
  // container lands non-zero dimensions.
  //
  // NB: the effect only acts when the *values* genuinely differ from what
  // the socket was opened against — Activity re-mounts (refs preserved,
  // org/project unchanged) are no-ops.
  useEffect(() => {
    const connected = connectedContextRef.current;
    if (!connected) return;
    const nextOrg = org?.name ?? null;
    const nextProject = project?.name ?? null;
    if (connected.org === nextOrg && connected.project === nextProject) return;

    tearDownSession('context-changed');

    // If the panel is currently on screen, reconnect now so the user sees
    // an immediate reset → welcome → new prompt. Otherwise leave
    // `hasWrittenWelcome` cleared (tearDownSession did that) so the
    // ResizeObserver re-fires the welcome + connect path the next time
    // the panel becomes visible.
    const container = containerRef.current;
    const term = terminalRef.current;
    const isVisible = !!container && container.offsetWidth > 0 && container.offsetHeight > 0;
    if (isVisible && term) {
      hasWrittenWelcome.current = true;
      term.write(WELCOME);
      connect();
    }
  }, [org?.name, project?.name, connect, tearDownSession]);

  // NB: we deliberately do NOT close the WebSocket in a useEffect cleanup.
  // React 19's <Activity mode="hidden"> tears down effect cleanups (so it can
  // restore them on re-show while keeping state), which would close the socket
  // every time the user switches tabs in the bottom bar. Instead we let the
  // browser close the socket on page unload — the server enforces an idle
  // timeout that reaps anything the browser doesn't tidy up itself.
  //
  // Clear any stale "session active" signal inherited from a previous
  // TerminalPanel instance (e.g. the user switched projects, the old panel
  // unmounted without its `close` event firing because the socket was
  // abandoned, and this fresh mount shouldn't report as already-running).
  // Gated on `isFirstMount.current` so we don't clobber a live flag when
  // Activity re-shows the panel after a hide.
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      setSessionActive(false);
    }
  }, [setSessionActive]);

  // ─── Drag-drop handlers ───────────────────────────────────────────────────

  // The overlay only shows when the browser is dragging *files* (not text or
  // images from another element). `dataTransfer.types` includes 'Files'
  // during a file drag regardless of which child element we're over.
  const hasFiles = (e: React.DragEvent<HTMLDivElement>) =>
    Array.from(e.dataTransfer?.types ?? []).includes('Files');

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    // dragleave fires for every child boundary we cross, not just the
    // outer container — a naive boolean flip makes the overlay flicker.
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!hasFiles(e)) return;
    // Required for a drop event to fire; without it the browser reverts to
    // its default (opening the file in a new tab and navigating away).
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    void uploadFile(file);
  };

  return (
    <div
      ref={containerRef}
      className="bg-muted relative h-full w-full p-4 pt-0 [&_.xterm-viewport]:bg-transparent!"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}>
      <div ref={xtermDivRef} style={{ height: '100%', width: '100%' }} />
      {isDragging && (
        <div
          aria-hidden
          className="border-primary/60 bg-muted/85 text-foreground pointer-events-none absolute inset-2 flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed backdrop-blur-sm">
          <div className="text-sm font-medium">Drop to upload</div>
          <div className="text-muted-foreground text-xs">
            {ALLOWED_UPLOAD_EXTENSIONS.join(' · ')} · max {Math.floor(MAX_UPLOAD_BYTES / 1024)} KB
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
            The file will be staged for{' '}
            <code className="rounded bg-black/20 px-1 py-0.5">datumctl apply -f</code>
          </div>
        </div>
      )}
    </div>
  );
}
