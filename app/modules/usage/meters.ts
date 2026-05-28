// app/modules/usage/meters.ts
//
// Canonical meter and resource identifiers for the AI assistant. These
// MUST stay in sync with the assistant ServiceConfiguration in
// config/services/services_v1alpha1_serviceconfiguration_assistant.yaml,
// which the services-operator fans out into
// billing.miloapis.com/MeterDefinition and MonitoredResourceType
// objects in Milo.
//
// metrics[].name, .kind, .unit and monitoredResourceTypes[].type,
// .gvk are immutable on the ServiceConfiguration side once Published;
// treat the names below as wire constants and version any breaking
// change as a new metric name (e.g. ".../v2").

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
