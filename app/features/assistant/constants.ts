/**
 * Static config for cloud-portal's project assistant ("Patch").
 *
 * Cloud has no model/effort picker — the server picks the model from
 * `ANTHROPIC_MODEL`. `MODEL_SELECTOR_ENABLED` stays `false` so the prompt card
 * hides the control and the client sends no model override.
 */
import type { EffortId } from './types';

export const MODEL_SELECTOR_ENABLED = false;

/**
 * Placeholder model/effort fed to the shared workspace, which requires the
 * props even though the selector is hidden. They are never sent to the server
 * while {@link MODEL_SELECTOR_ENABLED} is `false`.
 */
export const DEFAULT_MODEL_ID = '';
export const DEFAULT_EFFORT_ID: EffortId = 'high';

/** Suggestion starters shown on the empty/new-chat state (project-oriented). */
export const SUGGESTIONS = [
  'Give me a detailed summary of my project.',
  'How do I create a new DNS zone?',
  'How do I install the Datum Desktop app?',
  'Can you help me with a support ticket?',
  'What CLI command do I use to manage domains?',
] as const;
