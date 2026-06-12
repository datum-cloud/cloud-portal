export function formatUptime(createdAt: Date): string {
  const diffSecs = Math.floor((Date.now() - createdAt.getTime()) / 1000);
  const days = Math.floor(diffSecs / 86400);
  const hours = Math.floor((diffSecs % 86400) / 3600);
  const mins = Math.floor((diffSecs % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return parts.join(' ');
}

/** Split a slash-delimited path value (e.g. "provider/name") into its last segment and prefix. */
export function splitSlashValue(value: string): { main: string; sub: string } {
  const idx = value.lastIndexOf('/');
  if (idx === -1) return { main: value, sub: '' };
  return { main: value.slice(idx + 1), sub: value.slice(0, idx) };
}
