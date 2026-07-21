/**
 * Manifest resolution pipeline.
 *
 * Given a plugin spec, fetches `{assets.baseURL}{manifestPath}` server-side,
 * validates it, computes a digest, and evaluates SDK compatibility — producing
 * the Discovered / Compatible / Ready conditions and a manifest snapshot. This
 * is the identical pipeline for every registry source (static, kubeconfig,
 * platform); only discovery differs.
 */
import { validateManifest } from '../manifest.schema';
import { isSdkCompatible } from '../sdk-range';
import {
  DEFAULT_MANIFEST_PATH,
  HOST_SDK_VERSION,
  type PluginAssets,
  type PluginCondition,
  type PluginEntryStatus,
  type PluginManifest,
  type PluginManifestSnapshot,
  type PortalPluginSpec,
} from '../types';
import { withCaBundle } from './plugin-fetch';
import { createHash } from 'node:crypto';

export interface ManifestResolution {
  manifest?: PluginManifest;
  manifestDigest?: string;
  status: PluginEntryStatus;
}

export interface ResolveManifestOptions {
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable clock for deterministic snapshots in tests. */
  now?: () => Date;
}

/** Joins an asset base URL with the manifest path, tolerating trailing slashes. */
export function buildManifestUrl(assets: PluginAssets): string {
  const base = assets.baseURL.replace(/\/+$/, '');
  const path = assets.manifestPath?.trim() || DEFAULT_MANIFEST_PATH;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

function condition(
  type: PluginCondition['type'],
  status: PluginCondition['status'],
  reason: string,
  message?: string
): PluginCondition {
  return message ? { type, status, reason, message } : { type, status, reason };
}

function countExtensions(manifest: PluginManifest): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ext of manifest.extensions) {
    counts[ext.type] = (counts[ext.type] ?? 0) + 1;
  }
  return counts;
}

/** Status for a plugin whose manifest could not be discovered. */
function notDiscovered(reason: string, message: string): PluginEntryStatus {
  return {
    conditions: [
      condition('Discovered', 'False', reason, message),
      condition('Compatible', 'Unknown', 'ManifestNotDiscovered'),
      condition('Ready', 'False', 'NotDiscovered'),
    ],
  };
}

/**
 * Runs the full manifest pipeline for a spec. Never throws: every failure mode
 * is captured as a status condition so the registry can record health without
 * the source loop crashing.
 */
export async function resolveManifest(
  spec: PortalPluginSpec,
  options: ResolveManifestOptions = {}
): Promise<ManifestResolution> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  const url = buildManifestUrl(spec.assets);

  let response: Response;
  try {
    response = await fetchImpl(
      url,
      withCaBundle({ method: 'GET', redirect: 'follow' }, spec.assets.caBundle)
    );
  } catch (err) {
    return {
      status: notDiscovered('ManifestFetchError', err instanceof Error ? err.message : String(err)),
    };
  }

  if (!response.ok) {
    return { status: notDiscovered('ManifestFetchFailed', `HTTP ${response.status} from ${url}`) };
  }

  const rawBody = await response.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { status: notDiscovered('ManifestInvalid', 'manifest is not valid JSON') };
  }

  const validation = validateManifest(parsed);
  if (!validation.valid) {
    return { status: notDiscovered('ManifestInvalid', validation.errors.join('; ')) };
  }

  const { manifest, unknownExtensionTypes } = validation;
  const digest = `sha256:${createHash('sha256').update(rawBody).digest('hex')}`;

  const compatible = isSdkCompatible(manifest.sdk.range);
  const discoveredMessage =
    unknownExtensionTypes.length > 0
      ? `ignored unknown extension types: ${unknownExtensionTypes.join(', ')}`
      : undefined;

  const conditions: PluginCondition[] = [
    condition('Discovered', 'True', 'ManifestFetched', discoveredMessage),
    compatible
      ? condition('Compatible', 'True', 'SDKRangeSatisfied')
      : condition(
          'Compatible',
          'False',
          'SDKRangeUnsatisfied',
          `host SDK ${HOST_SDK_VERSION} does not satisfy "${manifest.sdk.range}"`
        ),
  ];

  // Ready aggregates discovery, compatibility, and the suspend kill switch.
  if (spec.suspend) {
    conditions.push(condition('Ready', 'False', 'Suspended'));
  } else if (!compatible) {
    conditions.push(condition('Ready', 'False', 'Incompatible'));
  } else {
    conditions.push(condition('Ready', 'True', 'PluginLoaded'));
  }

  const snapshot: PluginManifestSnapshot = {
    version: manifest.version,
    sdkRange: manifest.sdk.range,
    digest,
    fetchedAt: now().toISOString(),
    extensions: countExtensions(manifest),
  };

  return {
    manifest,
    manifestDigest: digest,
    status: { conditions, manifest: snapshot },
  };
}

/** Whether a resolved status marks the plugin Ready (servable). */
export function isReady(status: PluginEntryStatus): boolean {
  return status.conditions.some((c) => c.type === 'Ready' && c.status === 'True');
}
