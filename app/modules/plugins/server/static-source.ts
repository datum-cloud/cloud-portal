/**
 * Static registry source (dev only, Tier 0).
 *
 * Two composable env inputs, both hard-disabled outside development:
 * - `PORTAL_PLUGINS="<slug>=<url>,…"` — the simple syntax, for pure UI
 *   iteration.
 * - `PORTAL_PLUGINS_JSON=[…]` — a spec-shaped array, for when a Tier 0 plugin
 *   needs richer options the simple syntax doesn't expose (a custom
 *   `manifestPath`, `caBundle`, or `visibility` overrides). JSON entries take
 *   precedence over the simple syntax on slug collision.
 *
 * Synthesized entries run the identical manifest pipeline as production; only
 * discovery is short-circuited. They are `devMode` (relaxed gating + "dev
 * plugin" badge) with `visibility.entitlement = None` by default.
 */
import { DEFAULT_MANIFEST_PATH, type PortalPluginSpec } from '../types';
import type { PluginRegistry } from './registry';
import { z } from 'zod';

/** A DNS label: lowercase alphanumerics and hyphens, not hyphen-bounded. */
const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

export interface ParsedStaticPlugin {
  slug: string;
  baseURL: string;
}

export interface ParsePortalPluginsResult {
  entries: ParsedStaticPlugin[];
  errors: string[];
}

/**
 * Parses the `PORTAL_PLUGINS` env value. Malformed items are skipped and
 * reported in `errors` rather than throwing, so one bad entry never blocks the
 * rest of the dev registry.
 */
export function parsePortalPlugins(raw: string | undefined): ParsePortalPluginsResult {
  const entries: ParsedStaticPlugin[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  if (!raw || raw.trim() === '') return { entries, errors };

  for (const item of raw.split(',')) {
    const trimmed = item.trim();
    if (trimmed === '') continue;

    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      errors.push(`invalid entry "${trimmed}" (expected "<slug>=<url>")`);
      continue;
    }

    const slug = trimmed.slice(0, eq).trim();
    const url = trimmed.slice(eq + 1).trim();

    if (!DNS_LABEL.test(slug)) {
      errors.push(`invalid slug "${slug}" (must be a DNS label)`);
      continue;
    }
    if (seen.has(slug)) {
      errors.push(`duplicate slug "${slug}"`);
      continue;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      errors.push(`invalid URL "${url}" for slug "${slug}"`);
      continue;
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      errors.push(`unsupported URL scheme "${parsedUrl.protocol}" for slug "${slug}"`);
      continue;
    }

    seen.add(slug);
    entries.push({ slug, baseURL: url.replace(/\/+$/, '') });
  }

  return { entries, errors };
}

/** Builds the synthesized spec for a simple-syntax (dev-override) plugin. */
export function staticPluginSpec(parsed: ParsedStaticPlugin): PortalPluginSpec {
  return {
    slug: parsed.slug,
    displayName: parsed.slug,
    deprecated: false,
    suspend: false,
    assets: {
      baseURL: parsed.baseURL,
      manifestPath: DEFAULT_MANIFEST_PATH,
    },
    visibility: { entitlement: 'None' },
  };
}

// ── PORTAL_PLUGINS_JSON: spec-shaped entries with richer options ────────────

const portalPluginJsonEntrySchema = z.object({
  slug: z.string().regex(DNS_LABEL, 'must be a DNS label'),
  displayName: z.string().optional(),
  assets: z.object({
    baseURL: z.url(),
    manifestPath: z.string().optional(),
    caBundle: z.string().optional(),
  }),
  visibility: z
    .object({
      entitlement: z.enum(['Required', 'None']).optional(),
      featureFlag: z.string().optional(),
    })
    .optional(),
});

const portalPluginsJsonSchema = z.array(portalPluginJsonEntrySchema);

type PortalPluginJsonEntry = z.infer<typeof portalPluginJsonEntrySchema>;

export interface ParsePortalPluginsJsonResult {
  specs: PortalPluginSpec[];
  errors: string[];
}

function jsonEntryToSpec(entry: PortalPluginJsonEntry): PortalPluginSpec {
  return {
    slug: entry.slug,
    displayName: entry.displayName ?? entry.slug,
    deprecated: false,
    suspend: false,
    assets: {
      baseURL: entry.assets.baseURL.replace(/\/+$/, ''),
      manifestPath: entry.assets.manifestPath?.trim() || DEFAULT_MANIFEST_PATH,
      caBundle: entry.assets.caBundle || undefined,
    },
    visibility: {
      entitlement: entry.visibility?.entitlement ?? 'None',
      featureFlag: entry.visibility?.featureFlag,
    },
  };
}

/**
 * Parses `PORTAL_PLUGINS_JSON` (a JSON array of spec-shaped entries) with zod.
 * Invalid JSON or schema violations are reported in `errors`, not thrown.
 */
export function parsePortalPluginsJson(raw: string | undefined): ParsePortalPluginsJsonResult {
  const specs: PortalPluginSpec[] = [];
  const errors: string[] = [];

  if (!raw || raw.trim() === '') return { specs, errors };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    errors.push('not valid JSON');
    return { specs, errors };
  }

  const result = portalPluginsJsonSchema.safeParse(parsed);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      errors.push(path ? `${path}: ${issue.message}` : issue.message);
    }
    return { specs, errors };
  }

  const seen = new Set<string>();
  for (const entry of result.data) {
    if (seen.has(entry.slug)) {
      errors.push(`duplicate slug "${entry.slug}"`);
      continue;
    }
    seen.add(entry.slug);
    specs.push(jsonEntryToSpec(entry));
  }

  return { specs, errors };
}

/**
 * Composes both static inputs into a deduplicated spec list. `PORTAL_PLUGINS_JSON`
 * entries take precedence over the simple `PORTAL_PLUGINS` syntax on slug
 * collision. Errors are prefixed with their source var for legible logs.
 */
export function composeStaticSpecs(
  raw: string | undefined,
  rawJson: string | undefined
): { specs: PortalPluginSpec[]; errors: string[] } {
  const errors: string[] = [];
  const bySlug = new Map<string, PortalPluginSpec>();

  const simple = parsePortalPlugins(raw);
  for (const e of simple.errors) errors.push(`PORTAL_PLUGINS: ${e}`);
  for (const entry of simple.entries) bySlug.set(entry.slug, staticPluginSpec(entry));

  const json = parsePortalPluginsJson(rawJson);
  for (const e of json.errors) errors.push(`PORTAL_PLUGINS_JSON: ${e}`);
  for (const spec of json.specs) bySlug.set(spec.slug, spec); // JSON wins on collision

  return { specs: [...bySlug.values()], errors };
}

export interface StaticSourceOptions {
  /** Raw `PORTAL_PLUGINS` value; defaults to the env var. */
  raw?: string;
  /** Raw `PORTAL_PLUGINS_JSON` value; defaults to the env var. */
  rawJson?: string;
  /**
   * Re-resolve manifests on this interval (ms) so manifest edits appear without
   * a portal restart during dev. `0` disables polling. Defaults to 5000.
   */
  refreshIntervalMs?: number;
  logger?: Pick<Console, 'warn' | 'info'>;
}

export class StaticSource {
  private readonly registry: PluginRegistry;
  private readonly raw: string | undefined;
  private readonly rawJson: string | undefined;
  private readonly refreshIntervalMs: number;
  private readonly logger: Pick<Console, 'warn' | 'info'>;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(registry: PluginRegistry, options: StaticSourceOptions = {}) {
    this.registry = registry;
    this.raw = options.raw ?? process.env.PORTAL_PLUGINS;
    this.rawJson = options.rawJson ?? process.env.PORTAL_PLUGINS_JSON;
    this.refreshIntervalMs = options.refreshIntervalMs ?? 5000;
    this.logger = options.logger ?? console;
  }

  /** Seeds the registry from both env inputs and starts optional refresh polling. */
  async start(): Promise<void> {
    const { specs, errors } = composeStaticSpecs(this.raw, this.rawJson);
    for (const error of errors) {
      this.logger.warn(`[plugins] ${error}`);
    }
    if (specs.length === 0) return;

    this.logger.info(
      `[plugins] static source loading ${specs.length} dev plugin(s): ${specs
        .map((s) => s.slug)
        .join(', ')}`
    );

    await this.seed(specs);

    if (this.refreshIntervalMs > 0) {
      this.timer = setInterval(() => {
        void this.seed(specs);
      }, this.refreshIntervalMs);
      // Don't keep the process alive solely for dev polling.
      this.timer.unref?.();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async seed(specs: PortalPluginSpec[]): Promise<void> {
    await Promise.all(
      specs.map((spec) =>
        this.registry.upsert('static', spec, true).catch((err: unknown) => {
          this.logger.warn(
            `[plugins] failed to resolve static plugin "${spec.slug}": ${String(err)}`
          );
        })
      )
    );
  }
}
