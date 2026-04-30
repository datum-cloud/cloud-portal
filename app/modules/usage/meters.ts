// app/modules/usage/meters.ts
//
// Canonical meter and resource identifiers for the AI assistant. These
// MUST stay in sync with the catalog entries in:
//   - datum-cloud/services       (Service + MeterDefinition)
//   - datum-cloud/billing        (MonitoredResourceType + mirrored MeterDefinition)
//
// `meterName` and the resource group/kind are immutable on the catalog
// side once Published; treat them as wire constants here.

export const ASSISTANT_SERVICE_NAME = 'assistant.miloapis.com';

/** Group/Kind that emits assistant usage events. */
export const ASSISTANT_RESOURCE_GROUP = 'assistant.miloapis.com';
export const ASSISTANT_RESOURCE_KIND = 'Conversation';

/** Canonical meter names. Reverse-DNS path under the service name. */
export const ASSISTANT_METERS = {
  inputTokens: 'assistant.miloapis.com/conversation/input-tokens',
  outputTokens: 'assistant.miloapis.com/conversation/output-tokens',
  cacheReadTokens: 'assistant.miloapis.com/conversation/cache-read-tokens',
  cacheWriteTokens: 'assistant.miloapis.com/conversation/cache-write-tokens',
  messages: 'assistant.miloapis.com/conversation/messages',
} as const;

export type AssistantMeterKey = keyof typeof ASSISTANT_METERS;
