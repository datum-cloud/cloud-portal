/**
 * Module Federation host runtime — CLIENT-ONLY.
 *
 * Owns the single host federation instance and loads plugin components through
 * it. The host pins `react`, `react-dom`, `react-router`, and
 * `@tanstack/react-query` as shared singletons backed by the host's own module
 * instances (`lib` getters), so every plugin renders with the host's design
 * system, router, and query client — a plugin can never ship a divergent React
 * or a second Router (`useParams`, `Link`, `useNavigate` behave identically
 * inside plugin pages).
 *
 * Assets load exclusively through the same-origin proxy: a plugin's remote
 * entry is `/api/plugins/<slug>/<remoteEntry>` and its chunks resolve relative
 * to `/api/plugins/<slug>/`. Plugin origins are never exposed to the browser.
 */
import { parseCodeRef, pickCodeRefExport } from './code-ref';
import * as DatumUiBadge from '@datum-cloud/datum-ui/badge';
import * as DatumUiBreadcrumb from '@datum-cloud/datum-ui/breadcrumb';
import * as DatumUiButton from '@datum-cloud/datum-ui/button';
import * as DatumUiCard from '@datum-cloud/datum-ui/card';
import * as DatumUiCheckbox from '@datum-cloud/datum-ui/checkbox';
import * as DatumUiDataTable from '@datum-cloud/datum-ui/data-table';
import * as DatumUiDateTime from '@datum-cloud/datum-ui/date-time';
import * as DatumUiDialog from '@datum-cloud/datum-ui/dialog';
import * as DatumUiDropdown from '@datum-cloud/datum-ui/dropdown';
import * as DatumUiEmptyContent from '@datum-cloud/datum-ui/empty-content';
import * as DatumUiGroupedTable from '@datum-cloud/datum-ui/grouped-table';
import * as DatumUiHooks from '@datum-cloud/datum-ui/hooks';
import * as DatumUiIcons from '@datum-cloud/datum-ui/icons';
import * as DatumUiInput from '@datum-cloud/datum-ui/input';
import * as DatumUiInputGroup from '@datum-cloud/datum-ui/input-group';
import * as DatumUiLabel from '@datum-cloud/datum-ui/label';
import * as DatumUiLogs from '@datum-cloud/datum-ui/logs';
import * as DatumUiMultiSelect from '@datum-cloud/datum-ui/multi-select';
import * as DatumUiPageTitle from '@datum-cloud/datum-ui/page-title';
import * as DatumUiPicker from '@datum-cloud/datum-ui/picker';
import * as DatumUiPopover from '@datum-cloud/datum-ui/popover';
import * as DatumUiSelect from '@datum-cloud/datum-ui/select';
import * as DatumUiSeparator from '@datum-cloud/datum-ui/separator';
import * as DatumUiSkeleton from '@datum-cloud/datum-ui/skeleton';
import * as DatumUiSpinner from '@datum-cloud/datum-ui/spinner';
import * as DatumUiTable from '@datum-cloud/datum-ui/table';
import * as DatumUiTabs from '@datum-cloud/datum-ui/tabs';
import * as DatumUiToast from '@datum-cloud/datum-ui/toast';
import * as DatumUiTooltip from '@datum-cloud/datum-ui/tooltip';
import * as DatumUiTypography from '@datum-cloud/datum-ui/typography';
import * as DatumUiUtils from '@datum-cloud/datum-ui/utils';
import * as PortalPluginSdk from '@datum-cloud/portal-plugin-sdk';
import { init, loadRemote, registerRemotes } from '@module-federation/runtime';
import * as ReactQuery from '@tanstack/react-query';
import reactQueryPkg from '@tanstack/react-query/package.json';
import type { ComponentType } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as ReactRouter from 'react-router';
import reactRouterPkg from 'react-router/package.json';

const HOST_NAME = 'datum-portal-host';

/**
 * Curated `@datum-cloud/datum-ui` subpaths shared with plugins (the "curated,
 * semver-stable component subset" from the enhancement's open questions). Each
 * is a host-backed singleton keyed by its full import specifier, so a plugin's
 * `import { Badge } from '@datum-cloud/datum-ui/badge'` resolves to the host's
 * copy — identical styling (the host stylesheet already contains these
 * components' classes) and zero duplication. Grow this list additively; never
 * remove an entry without a plugin-SDK major bump.
 *
 * datum-ui does not export its package.json, and version negotiation is
 * deliberately disabled (`requiredVersion: false` — the host copy always wins),
 * so the advertised version is nominal.
 */
const DATUM_UI_SHARED: Record<string, unknown> = {
  '@datum-cloud/datum-ui/badge': DatumUiBadge,
  '@datum-cloud/datum-ui/breadcrumb': DatumUiBreadcrumb,
  '@datum-cloud/datum-ui/button': DatumUiButton,
  '@datum-cloud/datum-ui/card': DatumUiCard,
  '@datum-cloud/datum-ui/checkbox': DatumUiCheckbox,
  '@datum-cloud/datum-ui/data-table': DatumUiDataTable,
  '@datum-cloud/datum-ui/date-time': DatumUiDateTime,
  '@datum-cloud/datum-ui/dialog': DatumUiDialog,
  '@datum-cloud/datum-ui/dropdown': DatumUiDropdown,
  '@datum-cloud/datum-ui/empty-content': DatumUiEmptyContent,
  '@datum-cloud/datum-ui/grouped-table': DatumUiGroupedTable,
  '@datum-cloud/datum-ui/hooks': DatumUiHooks,
  '@datum-cloud/datum-ui/icons': DatumUiIcons,
  '@datum-cloud/datum-ui/input': DatumUiInput,
  '@datum-cloud/datum-ui/input-group': DatumUiInputGroup,
  '@datum-cloud/datum-ui/label': DatumUiLabel,
  '@datum-cloud/datum-ui/logs': DatumUiLogs,
  '@datum-cloud/datum-ui/multi-select': DatumUiMultiSelect,
  '@datum-cloud/datum-ui/page-title': DatumUiPageTitle,
  '@datum-cloud/datum-ui/picker': DatumUiPicker,
  '@datum-cloud/datum-ui/popover': DatumUiPopover,
  '@datum-cloud/datum-ui/select': DatumUiSelect,
  '@datum-cloud/datum-ui/separator': DatumUiSeparator,
  '@datum-cloud/datum-ui/skeleton': DatumUiSkeleton,
  '@datum-cloud/datum-ui/spinner': DatumUiSpinner,
  '@datum-cloud/datum-ui/table': DatumUiTable,
  '@datum-cloud/datum-ui/tabs': DatumUiTabs,
  '@datum-cloud/datum-ui/toast': DatumUiToast,
  '@datum-cloud/datum-ui/tooltip': DatumUiTooltip,
  '@datum-cloud/datum-ui/typography': DatumUiTypography,
  '@datum-cloud/datum-ui/utils': DatumUiUtils,
};

/**
 * Subpaths too heavy to put in the host's plugin bundle (the Monaco editor,
 * recharts, the assistant's chat stack). They are still host-backed singletons,
 * but load only when a plugin first imports one.
 */
const DATUM_UI_SHARED_LAZY: Record<string, () => Promise<unknown>> = {
  '@datum-cloud/datum-ui/assistant': () => import('@datum-cloud/datum-ui/assistant'),
  '@datum-cloud/datum-ui/chart': () => import('@datum-cloud/datum-ui/chart'),
  '@datum-cloud/datum-ui/code-editor': () => import('@datum-cloud/datum-ui/code-editor'),
};

/**
 * Host-provided shared singletons. `singleton: true` guarantees one instance
 * across host + all plugins; `requiredVersion: false` means the host does not
 * reject a plugin over a version delta — the host's `lib` instance always wins,
 * which is the entire point (plugins consume the host's React/router/query).
 */
function hostShared() {
  return {
    react: {
      version: React.version,
      lib: () => React,
      shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
    },
    'react-dom': {
      version: ReactDOM.version,
      lib: () => ReactDOM,
      shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
    },
    // React 19's createRoot/hydrateRoot live in this subpath, which Module
    // Federation treats as a distinct shared module from 'react-dom' rather
    // than folding it in automatically. Without an explicit host-side entry,
    // a plugin that imports it (transitively, via some UI dependency) tries
    // to "bridge" against nothing here and crashes with React's own
    // "incompatible react/react-dom versions" invariant instead of cleanly
    // falling back — hit by the assistant plugin's chat dock.
    'react-dom/client': {
      version: ReactDOM.version,
      lib: () => ReactDOMClient,
      shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
    },
    'react-router': {
      version: reactRouterPkg.version,
      lib: () => ReactRouter,
      shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
    },
    '@tanstack/react-query': {
      version: reactQueryPkg.version,
      lib: () => ReactQuery,
      shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
    },
    // The plugin SDK's hooks read a React Context defined inside this module.
    // That Context is only ever the host's Context — the one
    // PortalPluginHostProvider (see plugin-sdk-bindings.tsx) actually
    // provides a value to — if every plugin resolves this exact module
    // instance instead of bundling its own copy. `singleton: true` + `eager`
    // guarantees that, the same way it does for react/react-router above.
    // `requiredVersion: false` matches SDK compatibility being checked
    // separately, via the manifest's `sdk.range` against HOST_SDK_VERSION.
    '@datum-cloud/portal-plugin-sdk': {
      version: PortalPluginSdk.SDK_VERSION,
      lib: () => PortalPluginSdk,
      shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
    },
    ...Object.fromEntries(
      Object.entries(DATUM_UI_SHARED).map(([specifier, mod]) => [
        specifier,
        {
          version: '1.0.0',
          lib: () => mod,
          shareConfig: { singleton: true, requiredVersion: false as const, eager: true },
        },
      ])
    ),
    ...Object.fromEntries(
      Object.entries(DATUM_UI_SHARED_LAZY).map(([specifier, load]) => [
        specifier,
        {
          version: '1.0.0',
          get: () => load().then((mod) => () => mod),
          shareConfig: { singleton: true, requiredVersion: false as const },
        },
      ])
    ),
  };
}

/**
 * Identifies a plugin remote. Two names are deliberately distinct:
 * - `remoteName` is the Module Federation container name (the manifest `name`,
 *   e.g. `sample.miloapis.com`) — what `loadRemote` keys on and what the plugin
 *   bundle self-identifies as.
 * - `slug` is the URL/asset-proxy segment (e.g. `sample`) — only the entry URL
 *   uses it.
 */
export interface PluginRemoteRef {
  remoteName: string;
  slug: string;
  remoteEntry: string;
}

let hostInitialized = false;
/** Remote (container) names already registered this session. */
const registeredRemotes = new Set<string>();

/** Same-origin asset-proxy remote entry URL for a plugin. */
export function remoteEntryUrl(slug: string, remoteEntry: string): string {
  return `/api/plugins/${slug}/${remoteEntry.replace(/^\/+/, '')}`;
}

function ensureHost(): void {
  if (hostInitialized) return;
  init({
    name: HOST_NAME,
    remotes: [],
    shared: hostShared(),
  });
  hostInitialized = true;
}

/**
 * Module Federation entry type for plugin remotes. Plugin remote entries are ES
 * modules (that's what `@module-federation/vite` emits), so the runtime must
 * load them via dynamic `import()` — a classic `<script>` throws "Cannot use
 * import statement outside a module". Required for every plugin; the
 * `remote-config.test.ts` regression guard asserts it stays `'module'`.
 */
export const PLUGIN_REMOTE_ENTRY_TYPE = 'module' as const;

/**
 * Build the Module Federation remote descriptor for a plugin. Pure — no host
 * init, no registration — so the `type: 'module'` contract can be regression
 * tested without touching the federation runtime.
 */
export function buildPluginRemote({ remoteName, slug, remoteEntry }: PluginRemoteRef): {
  name: string;
  entry: string;
  type: typeof PLUGIN_REMOTE_ENTRY_TYPE;
} {
  return {
    name: remoteName,
    entry: remoteEntryUrl(slug, remoteEntry),
    type: PLUGIN_REMOTE_ENTRY_TYPE,
  };
}

/**
 * Register a plugin's remote entry with the host, keyed by container name.
 * Idempotent: re-registering the same remote (e.g. re-navigating into the
 * plugin) is a no-op, and `registerRemotes` itself replaces an existing entry
 * rather than throwing.
 */
export function registerPluginRemote(ref: PluginRemoteRef): void {
  ensureHost();
  if (registeredRemotes.has(ref.remoteName)) return;
  registerRemotes([buildPluginRemote(ref)]);
  registeredRemotes.add(ref.remoteName);
}

/**
 * Load a plugin component by `$codeRef`. Ensures the plugin's remote is
 * registered, resolves the exposed module through Module Federation, and picks
 * the referenced export. Throws when the module or export cannot be resolved so
 * the caller's ErrorBoundary renders a friendly failure instead of a blank
 * page.
 */
export async function loadPluginComponent(
  ref: PluginRemoteRef,
  codeRef: string
): Promise<ComponentType<unknown>> {
  registerPluginRemote(ref);

  const parsed = parseCodeRef(codeRef);
  const loaded = await loadRemote<Record<string, unknown>>(`${ref.remoteName}/${parsed.module}`);

  const component = pickCodeRefExport<ComponentType<unknown>>(loaded, parsed);
  if (typeof component !== 'function') {
    throw new Error(
      `Plugin "${ref.slug}" code ref "${codeRef}" did not resolve to a component ` +
        `(module "${parsed.module}"${parsed.exportName ? `, export "${parsed.exportName}"` : ''}).`
    );
  }
  return component;
}
