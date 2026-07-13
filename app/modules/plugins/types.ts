/**
 * Portal Plugin System — shared contract types.
 *
 * This module is the single source of truth for the plugin contract shared
 * between the server registry (this module) and the client runtime
 * (`portal-runtime`). It is pure types + string-literal constants: no runtime
 * logic and no server-only imports, so it is safe to import from anywhere.
 *
 * The shapes mirror the `PortalPlugin` CRD (portal.miloapis.com/v1alpha1) and
 * the `plugin-manifest.json` contract described in
 * `docs/enhancements/portal-plugin-system.md`.
 */

// ═══════════════════════════════════════════════════════════
// CRD identity (portal.miloapis.com/v1alpha1, cluster-scoped)
// ═══════════════════════════════════════════════════════════

export const PORTAL_PLUGIN_GROUP = 'portal.miloapis.com';
export const PORTAL_PLUGIN_VERSION = 'v1alpha1';
/** Plural resource name used in the Kubernetes REST path. */
export const PORTAL_PLUGIN_PLURAL = 'portalplugins';

/** Default manifest path appended to `assets.baseURL` when none is declared. */
export const DEFAULT_MANIFEST_PATH = '/plugin-manifest.json';

/**
 * Host SDK the portal advertises to plugins. A manifest whose `sdk.range` does
 * not match this version is loaded as `Compatible=False` (never served).
 */
export const HOST_SDK_NAME = '@datum-cloud/portal-plugin-sdk';
export const HOST_SDK_VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════
// Registry sources
// ═══════════════════════════════════════════════════════════

/**
 * Where a registry entry originated.
 * - `static`   — synthesized from `PORTAL_PLUGINS` (dev only).
 * - `kubeconfig`— watched from a local kwok cluster (dev only).
 * - `platform` — watched from the platform control plane (production; v1.x).
 */
export type PluginRegistrySource = 'static' | 'kubeconfig' | 'platform';

// ═══════════════════════════════════════════════════════════
// PortalPlugin spec (mirrors the CRD)
// ═══════════════════════════════════════════════════════════

/** Whether a proxied backend call carries the user's session bearer token. */
export type PluginProxyAuthorization = 'UserToken' | 'None';

/** Whether the plugin requires an Active ServiceEntitlement to be visible. */
export type PluginEntitlementRequirement = 'Required' | 'None';

export interface PluginAssets {
  /** HTTPS origin (service-team-operated) serving the built plugin. */
  baseURL: string;
  /** Path to the manifest under `baseURL`. Defaults to {@link DEFAULT_MANIFEST_PATH}. */
  manifestPath: string;
  /** Optional PEM bundle for an internal CA fronting `baseURL`. Server-only. */
  caBundle?: string;
}

export interface PluginProxyBackend {
  url: string;
}

/** A named non-Milo backend the plugin may call through the portal. */
export interface PluginProxyEntry {
  alias: string;
  backend: PluginProxyBackend;
  authorization: PluginProxyAuthorization;
}

export interface PluginVisibility {
  entitlement: PluginEntitlementRequirement;
  /** Optional OpenFeature flag key gating visibility. */
  featureFlag?: string;
  /** Optional early-access org allowlist; empty/absent = all orgs. */
  organizations?: string[];
}

/**
 * The `spec` of a PortalPlugin resource. In dev, the static/kubeconfig sources
 * synthesize equivalent specs so the downstream pipeline is identical.
 */
export interface PortalPluginSpec {
  /** Catalog Service object name (absent for synthesized dev entries). */
  serviceRef?: { name: string };
  /** Canonical reverse-DNS service id (absent for synthesized dev entries). */
  serviceName?: string;
  /** Unique DNS label; the URL + asset-proxy segment. */
  slug: string;
  displayName: string;
  /** True when the winning ServiceConfiguration is Deprecated. */
  deprecated: boolean;
  /** Platform-operator kill switch; suspended plugins are never served. */
  suspend: boolean;
  assets: PluginAssets;
  proxy: PluginProxyEntry[];
  visibility: PluginVisibility;
  /** Rarely needed; assets are same-origin proxied. */
  contentSecurityPolicy?: string[];
}

// ═══════════════════════════════════════════════════════════
// plugin-manifest.json
// ═══════════════════════════════════════════════════════════

export const EXTENSION_NAV_PROJECT = 'portal.nav/project';
export const EXTENSION_PAGE_PROJECT = 'portal.page/project';
export const EXTENSION_CARD_PROJECT_HOME = 'portal.card/project-home';

/** The v1 extension types the host recognizes and renders. */
export const KNOWN_EXTENSION_TYPES = [
  EXTENSION_NAV_PROJECT,
  EXTENSION_PAGE_PROJECT,
  EXTENSION_CARD_PROJECT_HOME,
] as const;

export type KnownExtensionType = (typeof KNOWN_EXTENSION_TYPES)[number];

/** A single RBAC check that must pass for an extension to render. */
export interface PluginPermissionRequirement {
  group: string;
  resource: string;
  verb: string;
}

export interface PluginExtensionRequirements {
  permissions?: PluginPermissionRequirement[];
}

/**
 * A lazy reference into a manifest's `exposedModules`: `"ModuleName"` or
 * `"ModuleName.exportName"`. No plugin code loads until the extension renders.
 */
export interface CodeRef {
  $codeRef: string;
}

/** `portal.nav/project` — item in the project sidebar. */
export interface NavProjectProperties {
  id: string;
  title: string;
  /** A lucide icon name, resolved by the host. Never plugin code. */
  icon: string;
  /** Path relative to the plugin's mount point. */
  path: string;
  order?: number;
}

export interface NavProjectExtension {
  type: typeof EXTENSION_NAV_PROJECT;
  properties: NavProjectProperties;
  requirements?: PluginExtensionRequirements;
}

/** `portal.page/project` — routed page under the plugin mount. */
export interface PageProjectProperties {
  /** Path relative to the mount point; supports params and nesting. */
  path: string;
  component: CodeRef;
}

export interface PageProjectExtension {
  type: typeof EXTENSION_PAGE_PROJECT;
  properties: PageProjectProperties;
  requirements?: PluginExtensionRequirements;
}

/** `portal.card/project-home` — card on the project home page. */
export interface CardProjectHomeProperties {
  title: string;
  component: CodeRef;
  order?: number;
}

export interface CardProjectHomeExtension {
  type: typeof EXTENSION_CARD_PROJECT_HOME;
  properties: CardProjectHomeProperties;
  requirements?: PluginExtensionRequirements;
}

/**
 * An extension type the host does not recognize. Tolerated, not fatal: the
 * registry records it and excludes it from rendering. The `{type, properties,
 * requirements}` envelope keeps growth additive.
 */
export interface UnknownExtension {
  type: string;
  properties?: Record<string, unknown>;
  requirements?: PluginExtensionRequirements;
}

export type KnownPluginExtension =
  | NavProjectExtension
  | PageProjectExtension
  | CardProjectHomeExtension;

export type PluginExtension = KnownPluginExtension | UnknownExtension;

export interface PluginManifest {
  /** Canonical plugin id, e.g. `compute.miloapis.com`. */
  name: string;
  version: string;
  sdk: {
    name: string;
    range: string;
  };
  /** Module Federation remote entry filename, relative to `assets.baseURL`. */
  remoteEntry: string;
  /** Map of exposed module name → source path. `$codeRef` targets live here. */
  exposedModules: Record<string, string>;
  extensions: PluginExtension[];
}

// ═══════════════════════════════════════════════════════════
// Registry entry (server-held; the resolved runtime view)
// ═══════════════════════════════════════════════════════════

export type PluginConditionType = 'Discovered' | 'Compatible' | 'Ready';
export type PluginConditionStatus = 'True' | 'False' | 'Unknown';

export interface PluginCondition {
  type: PluginConditionType | string;
  status: PluginConditionStatus;
  reason: string;
  message?: string;
}

/** Portal-resolved snapshot of a live manifest, mirrored into CRD status. */
export interface PluginManifestSnapshot {
  version: string;
  sdkRange: string;
  digest: string;
  fetchedAt: string;
  /** Extension type → count, e.g. `{ "portal.nav/project": 1 }`. */
  extensions: Record<string, number>;
}

export interface PluginEntryStatus {
  observedGeneration?: number;
  conditions: PluginCondition[];
  manifest?: PluginManifestSnapshot;
}

/**
 * A single plugin as held in the server's in-memory registry. Carries the
 * spec, its provenance, the resolved manifest (absent when the manifest failed
 * to fetch or validate), and health conditions.
 */
export interface PluginRegistryEntry {
  spec: PortalPluginSpec;
  /** True for dev-sourced plugins (relaxed gating + "dev plugin" badge). */
  devMode: boolean;
  source: PluginRegistrySource;
  /** Resolved + validated manifest. Undefined when discovery failed. */
  manifest?: PluginManifest;
  /** `sha256:…` digest of the fetched manifest bytes. */
  manifestDigest?: string;
  status: PluginEntryStatus;
}

// ═══════════════════════════════════════════════════════════
// Public wire shape (GET /api/plugins) — sanitized for the browser
// ═══════════════════════════════════════════════════════════

/**
 * The browser-safe projection of a registry entry served by `GET /api/plugins`.
 * Deliberately omits `caBundle`, `assets.baseURL`, and proxy backend URLs —
 * plugin origins are never exposed to the browser. The client loads assets and
 * proxies calls exclusively through `/api/plugins/<slug>/…`.
 */
export interface PublicPlugin {
  slug: string;
  displayName: string;
  devMode: boolean;
  deprecated: boolean;
  source: PluginRegistrySource;
  /** Declared proxy aliases (names only; backend URLs stay server-side). */
  proxyAliases: string[];
  manifest: {
    name: string;
    version: string;
    /** Filename to load via the asset proxy at `/api/plugins/<slug>/<remoteEntry>`. */
    remoteEntry: string;
    exposedModules: Record<string, string>;
    extensions: PluginExtension[];
  };
}
