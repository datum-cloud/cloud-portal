/**
 * Pure gating logic for the development-only registry sources.
 *
 * Kept free of any env import so it is trivially unit-testable: it decides,
 * from plain inputs, whether the static / kubeconfig sources should run. The
 * hard rule — dev sources NEVER run outside a development build — lives here.
 */

export interface DevSourcePlan {
  /** Whether to start the static source (PORTAL_PLUGINS / PORTAL_PLUGINS_JSON). */
  static: boolean;
  /** Whether to start the kubeconfig source (PLUGIN_REGISTRY_KUBECONFIG). */
  kubeconfig: boolean;
  /**
   * True when dev registry vars are set but this is NOT a development build, so
   * they are being ignored — the caller should log a warning.
   */
  disabledInProd: boolean;
}

export interface DevSourceInput {
  isDev: boolean;
  portalPlugins?: string;
  portalPluginsJson?: string;
  pluginRegistryKubeconfig?: string;
}

/**
 * Decides which dev sources to start. Outside a development build every source
 * is disabled regardless of configuration (fail-closed); `disabledInProd`
 * flags the misconfiguration so it can be surfaced.
 */
export function planDevSources(input: DevSourceInput): DevSourcePlan {
  const anyStatic = Boolean(input.portalPlugins || input.portalPluginsJson);
  const anyKubeconfig = Boolean(input.pluginRegistryKubeconfig);

  if (!input.isDev) {
    return { static: false, kubeconfig: false, disabledInProd: anyStatic || anyKubeconfig };
  }

  return { static: anyStatic, kubeconfig: anyKubeconfig, disabledInProd: false };
}
