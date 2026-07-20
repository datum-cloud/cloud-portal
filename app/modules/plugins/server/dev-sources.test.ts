/// <reference types="bun-types/test" />
import { planDevSources } from './dev-sources';
import { describe, expect, test } from 'bun:test';

describe('planDevSources', () => {
  test('starts the static source in dev when PORTAL_PLUGINS is set', () => {
    const plan = planDevSources({ isDev: true, portalPlugins: 'compute=http://localhost:7777' });
    expect(plan).toEqual({ static: true, kubeconfig: false, disabledInProd: false });
  });

  test('starts the static source in dev when only PORTAL_PLUGINS_JSON is set', () => {
    const plan = planDevSources({ isDev: true, portalPluginsJson: '[]' });
    expect(plan.static).toBe(true);
    expect(plan.disabledInProd).toBe(false);
  });

  test('starts the kubeconfig source in dev when the kubeconfig path is set', () => {
    const plan = planDevSources({ isDev: true, pluginRegistryKubeconfig: '.devenv/kubeconfig' });
    expect(plan).toEqual({ static: false, kubeconfig: true, disabledInProd: false });
  });

  test('starts nothing in dev when no vars are set', () => {
    const plan = planDevSources({ isDev: true });
    expect(plan).toEqual({ static: false, kubeconfig: false, disabledInProd: false });
  });

  test('HARD-DISABLES every source outside development, even with all vars set', () => {
    const plan = planDevSources({
      isDev: false,
      portalPlugins: 'compute=http://localhost:7777',
      portalPluginsJson: '[{"slug":"x","assets":{"baseURL":"http://localhost:7777"}}]',
      pluginRegistryKubeconfig: '.devenv/kubeconfig',
    });
    expect(plan.static).toBe(false);
    expect(plan.kubeconfig).toBe(false);
    // Flagged so the caller can warn that dev vars were ignored in prod.
    expect(plan.disabledInProd).toBe(true);
  });

  test('does not flag disabledInProd in a prod build with no dev vars set', () => {
    const plan = planDevSources({ isDev: false });
    expect(plan).toEqual({ static: false, kubeconfig: false, disabledInProd: false });
  });
});
