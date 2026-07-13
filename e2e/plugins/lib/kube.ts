/**
 * kubectl helper scoped to the local kwok registry.
 *
 * Used ONLY by the Tier 1 spec to apply/delete PortalPlugin CRs against the
 * local cluster. Never touches the remote platform.
 */
import { PORTAL_PLUGIN_PLURAL } from '../../../app/modules/plugins/types';
import { DEVENV_KUBECONFIG } from './config';
import { execFileSync } from 'node:child_process';

function kubectl(args: string[]): string {
  return execFileSync('kubectl', ['--kubeconfig', DEVENV_KUBECONFIG, ...args], {
    encoding: 'utf8',
    timeout: 60_000,
  }).trim();
}

/** Apply the registered-plugin CR (via the devenv task or a manifest path). */
export function deletePortalPlugin(name: string): void {
  kubectl(['delete', PORTAL_PLUGIN_PLURAL, name, '--ignore-not-found']);
}

/** Whether a PortalPlugin resource currently exists in the registry. */
export function portalPluginExists(name: string): boolean {
  try {
    kubectl(['get', PORTAL_PLUGIN_PLURAL, name, '-o', 'name']);
    return true;
  } catch {
    return false;
  }
}
