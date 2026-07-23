import type { Tool } from 'ai';

/**
 * Round-trip a value through JSON so it only ever contains JSON values.
 * Tool outputs are replayed into the model prompt on the next step, and the AI
 * SDK validates that prompt (`standardizePrompt`): a non-JSON value such as a
 * `Date` fails validation and aborts the entire conversation. Serializing turns
 * Dates into ISO strings and drops `undefined`/functions — exactly what the
 * model would have received anyway.
 */
export function toJsonSafe(value: unknown): unknown {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

/**
 * Wrap each tool's `execute` so its output is JSON-safe. Applied centrally so no
 * individual tool has to remember to serialize Dates (resource `createdAt`,
 * activity-log `timestamp`, …) before returning.
 */
export function withJsonSafeOutput<T extends Record<string, Tool>>(tools: T): T {
  for (const t of Object.values(tools)) {
    const execute = (t as { execute?: (...args: unknown[]) => unknown }).execute;
    if (typeof execute !== 'function') continue;
    (t as { execute: (...args: unknown[]) => unknown }).execute = async (...args) =>
      toJsonSafe(await execute(...args));
  }
  return tools;
}
