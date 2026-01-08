// app/modules/watch/watch.parser.ts
import type { WatchEvent } from './watch.types';

/**
 * Parse a single line from K8s Watch API stream.
 * Each line is a JSON object with { type, object }.
 */
export function parseWatchEvent<T = unknown>(line: string): WatchEvent<T> | null {
  if (!line.trim()) {
    return null;
  }

  try {
    const data = JSON.parse(line);

    if (!data.type || !data.object) {
      return null;
    }

    return {
      type: data.type,
      object: data.object as T,
    };
  } catch {
    return null;
  }
}

/**
 * Extract resourceVersion from a K8s object.
 */
export function extractResourceVersion(obj: unknown): string | undefined {
  if (
    typeof obj === 'object' &&
    obj !== null &&
    'metadata' in obj &&
    typeof (obj as { metadata?: { resourceVersion?: string } }).metadata === 'object'
  ) {
    return (obj as { metadata: { resourceVersion?: string } }).metadata?.resourceVersion;
  }
  return undefined;
}
