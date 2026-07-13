/**
 * State handed from global-setup to the test workers.
 *
 * Playwright workers are separate processes, so values discovered at setup time
 * (the project to navigate to, whether Tier 1 is available, alignment notes)
 * are passed through a JSON file rather than process.env.
 */
import { RUNTIME_STATE } from './config';
import fs from 'node:fs';
import path from 'node:path';

export interface RuntimeState {
  projectId: string;
  orgId: string;
  /** True only when kwok + devenv were available and the Tier 1 portal is up. */
  tier1Enabled: boolean;
  /** Why Tier 1 is disabled, surfaced in the skip message. */
  tier1SkipReason?: string;
  sampleSlug: string;
  sampleHomePath: string;
  tier1Slug: string;
  tier1PluginName: string;
  /** Platform-alignment notes for the run report (no secrets). */
  alignmentNotes: string[];
  datumctlEndpoint?: string;
  tokenIssuer?: string;

  // Service console (task #8) — the elaborated plugin + backend proxy.
  /** True only when the backend (:7778) is up AND the portal supports proxy aliases. */
  serviceConsoleEnabled: boolean;
  /** Why the service-console specs are skipped. */
  serviceConsoleSkipReason?: string;
  /** Declared proxy alias the plugin calls through the portal. */
  proxyAlias: string;
  /** Mount-relative path of the Instances list page. */
  instancesPath: string;
  /** Mount-relative path of the platform-data (read-only control-plane) page. */
  platformDataPath: string;
}

export function writeRuntimeState(state: RuntimeState) {
  fs.mkdirSync(path.dirname(RUNTIME_STATE), { recursive: true });
  fs.writeFileSync(RUNTIME_STATE, JSON.stringify(state, null, 2));
}

export function readRuntimeState(): RuntimeState {
  return JSON.parse(fs.readFileSync(RUNTIME_STATE, 'utf8'));
}
