// app/modules/usage/assistant-events.ts
//
// Pure builder that turns AI SDK token-usage output into v0 usage events.
// Kept side-effect-free so it can be unit-tested without HTTP, env, or
// timers.
import { ASSISTANT_METERS, ASSISTANT_RESOURCE_GROUP, ASSISTANT_RESOURCE_KIND } from './meters';
import type { UsageEvent } from './types';
import { ulid } from './ulid';

/**
 * Token counts surfaced by the AI SDK's `result.usage`. All fields are
 * optional because not every provider/model populates each axis.
 */
export interface AssistantUsageTokens {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cacheCreationInputTokens?: number;
  /** Per-request count; emitted as `messages` meter (always 1 for now). */
  messages?: number;
}

export interface BuildAssistantUsageInput {
  projectName: string;
  conversationId: string;
  conversationUid?: string;
  /** Anthropic model id, e.g. `claude-sonnet-4-6`. */
  model: string;
  namespace?: string;
  tokens: AssistantUsageTokens;
  /** Override for testing. Defaults to `Date.now()`. */
  now?: number;
}

/**
 * Build one usage event per non-zero token axis. Returns an empty array
 * when no axis has a positive count — never emits zero-valued events,
 * since they're noise to the pipeline and the aggregator.
 */
export function buildAssistantUsageEvents(input: BuildAssistantUsageInput): UsageEvent[] {
  const {
    projectName,
    conversationId,
    conversationUid,
    model,
    namespace = 'default',
    tokens,
    now = Date.now(),
  } = input;

  const timestamp = new Date(now).toISOString();
  const projectRef = { name: projectName };

  const dimensions: Record<string, string> = { model };

  const labels: Record<string, string> = { model };

  const resource = {
    ref: {
      projectRef,
      group: ASSISTANT_RESOURCE_GROUP,
      kind: ASSISTANT_RESOURCE_KIND,
      namespace,
      name: conversationId,
      ...(conversationUid ? { uid: conversationUid } : {}),
    },
    labels,
  } satisfies UsageEvent['resource'];

  const events: UsageEvent[] = [];

  const push = (meterName: string, count: number | undefined): void => {
    if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return;
    events.push({
      eventID: ulid(now),
      meterName,
      timestamp,
      projectRef,
      value: String(Math.round(count)),
      dimensions,
      resource,
    });
  };

  push(ASSISTANT_METERS.inputTokens, tokens.inputTokens);
  push(ASSISTANT_METERS.outputTokens, tokens.outputTokens);
  push(ASSISTANT_METERS.cacheReadTokens, tokens.cachedInputTokens);
  push(ASSISTANT_METERS.cacheWriteTokens, tokens.cacheCreationInputTokens);
  push(ASSISTANT_METERS.messages, tokens.messages ?? 1);

  return events;
}
