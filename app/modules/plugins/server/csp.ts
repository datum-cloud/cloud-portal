/**
 * Plugin Content-Security-Policy additions.
 *
 * A plugin spec may declare `contentSecurityPolicy` entries of the form
 * `"<directive> <source> [<source>…]"`. The host merges only sources on this
 * allowlist into its own policy and drops (and logs) everything else, so a
 * plugin can never weaken the nonce + `'strict-dynamic'` script policy:
 *
 * - `script-src 'wasm-unsafe-eval'` — permits compiling WebAssembly only. Unlike
 *   `'unsafe-eval'` it does not re-enable `eval()`, `new Function()` or
 *   string timers, so JavaScript injection stays blocked.
 * - `worker-src 'self'` — same-origin workers (served by the asset proxy).
 * - `connect-src https://<host>` / `wss://<host>` — exact hostnames only: no
 *   wildcards, ports, paths or other schemes.
 */
import type { PluginRegistryEntry } from '../types';

export interface PluginCspAdditions {
  scriptSrc: string[];
  workerSrc: string[];
  connectSrc: string[];
}

type AllowedDirective = keyof PluginCspAdditions;

const HOSTNAME = String.raw`(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}`;
const CONNECT_SOURCE = new RegExp(`^(?:https|wss)://${HOSTNAME}$`);

const ALLOWED: Record<string, { key: AllowedDirective; allows: (source: string) => boolean }> = {
  'script-src': { key: 'scriptSrc', allows: (s) => s === "'wasm-unsafe-eval'" },
  'worker-src': { key: 'workerSrc', allows: (s) => s === "'self'" },
  'connect-src': { key: 'connectSrc', allows: (s) => CONNECT_SOURCE.test(s) },
};

export const EMPTY_PLUGIN_CSP_ADDITIONS: PluginCspAdditions = Object.freeze({
  scriptSrc: [],
  workerSrc: [],
  connectSrc: [],
}) as PluginCspAdditions;

function isEmptyPluginCspAdditions(additions: PluginCspAdditions): boolean {
  return (
    additions.scriptSrc.length === 0 &&
    additions.workerSrc.length === 0 &&
    additions.connectSrc.length === 0
  );
}

/**
 * Merges the allowlisted CSP additions declared by each plugin. Output is
 * deduplicated and sorted so equal inputs always produce an equal policy.
 */
export function collectPluginCspAdditions(
  declared: ReadonlyArray<{ slug: string; contentSecurityPolicy?: unknown }>,
  logger: Pick<Console, 'warn'> = console
): PluginCspAdditions {
  const sets: Record<AllowedDirective, Set<string>> = {
    scriptSrc: new Set(),
    workerSrc: new Set(),
    connectSrc: new Set(),
  };
  const reject = (slug: string, value: unknown, reason: string) =>
    logger.warn(
      `[plugins] "${slug}" contentSecurityPolicy: rejected ${JSON.stringify(value)} (${reason})`
    );

  for (const { slug, contentSecurityPolicy } of declared) {
    if (!Array.isArray(contentSecurityPolicy)) continue;
    for (const entry of contentSecurityPolicy) {
      if (typeof entry !== 'string') {
        reject(slug, entry, 'not a string');
        continue;
      }
      const [directive = '', ...sources] = entry.trim().split(/\s+/);
      const rule = ALLOWED[directive.toLowerCase()];
      if (!rule) {
        reject(slug, entry, `directive "${directive}" is not allowed`);
        continue;
      }
      if (sources.length === 0) {
        reject(slug, entry, 'no sources');
        continue;
      }
      for (const source of sources) {
        if (rule.allows(source)) {
          sets[rule.key].add(source);
        } else {
          reject(slug, source, `source not allowed for ${directive.toLowerCase()}`);
        }
      }
    }
  }

  return {
    scriptSrc: [...sets.scriptSrc].sort(),
    workerSrc: [...sets.workerSrc].sort(),
    connectSrc: [...sets.connectSrc].sort(),
  };
}

/**
 * Returns a resolver for the CSP additions of every servable plugin. Parsing
 * (and rejection logging) reruns only when a declaration changes, not per
 * request.
 */
export function createPluginCspResolver(
  getPlugins: () => PluginRegistryEntry[],
  logger: Pick<Console, 'warn'> = console
): () => PluginCspAdditions {
  let lastKey = '[]';
  let last = EMPTY_PLUGIN_CSP_ADDITIONS;
  return () => {
    const declared = getPlugins()
      .filter((p) => p.spec.contentSecurityPolicy?.length)
      .map((p) => ({ slug: p.spec.slug, contentSecurityPolicy: p.spec.contentSecurityPolicy }));
    const key = JSON.stringify(declared);
    if (key !== lastKey) {
      lastKey = key;
      const additions = collectPluginCspAdditions(declared, logger);
      last = isEmptyPluginCspAdditions(additions) ? EMPTY_PLUGIN_CSP_ADDITIONS : additions;
    }
    return last;
  };
}
