import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useCallback, useEffect, useRef } from 'react';

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
const background = resolveCSSVar('--muted');
const primary = resolveCSSVar('--primary');

function toAnsi(rgb: string): string {
  const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
  return `\x1b[38;2;${r};${g};${b}m`;
}

const R = '\x1b[0m';
const B = '\x1b[1m';
const P = toAnsi(primary);

const WELCOME = [
  '',
  `${P}${B}    ____  ___  ________  ____  ___ ${R}`,
  `${P}${B}   / __ \\/   |/_  __/ / / /  |/  / ${R}`,
  `${P}${B}  / / / / /| | / / / / / / /|_/ /  ${R}`,
  `${P}${B} / /_/ / ___ |/ / / /_/ / /  / /   ${R}`,
  `${P}${B}/_____/_/  |_/_/  \\____/_/  /_/    ${R}`,
  '',
  `Manage your Datum Cloud resources via CLI.`,
  '',
].join('\r\n');

export function TerminalPanel() {
  const fitAddon = useRef(new FitAddon());
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const hasWrittenWelcome = useRef(false);

  // Callback ref: creates the terminal once when the div is first attached to the DOM.
  // Using a callback ref (not useEffect) means Activity's effect cleanup cycle never
  // disposes the terminal — the instance survives hide/show without losing its buffer.
  const xtermDivRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || terminalRef.current) return;
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'monospace',
      allowTransparency: true,
      theme: {
        background: 'rgba(0, 0, 0, 0)',
        foreground,
        cursor: foreground,
        cursorAccent: background,
      },
    });
    terminal.loadAddon(fitAddon.current);
    terminal.open(node);
    terminalRef.current = terminal;
  }, []);

  // Local echo — re-registers on Activity show, but typed content is unaffected
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    const disposable = terminal.onData((data) => {
      const code = data.charCodeAt(0);
      if (code === 127) terminal.write('\b \b');
      else if (data === '\r') terminal.write('\r\n');
      else terminal.write(data);
    });
    return () => disposable.dispose();
  });

  // Fit on first visible resize; write welcome once
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
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  });

  return (
    <div
      ref={containerRef}
      className="bg-muted h-full w-full p-4 pt-0 [&_.xterm-viewport]:bg-transparent!">
      <div ref={xtermDivRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
