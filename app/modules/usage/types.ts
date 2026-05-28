// app/modules/usage/types.ts
//
// Two related wire formats live here:
//
//   1. `UsageEvent` — the portal's *internal* builder shape. It's
//      ergonomic for `buildAssistantUsageEvents` to populate and stays
//      easy to unit-test without committing to CloudEvents trivia.
//
//   2. `CloudEvent` — the *external* wire shape the billing Ingestion
//      Gateway accepts at `POST /v1/usage/events:batchIngest`. Each
//      entry must satisfy the structural rules in
//      billing/internal/gateway/validate/validate.go (ULID id,
//      specversion/type/source/subject present, subject =
//      `projects/{name}`, datacontenttype = application/json,
//      data.value parseable as INT64).
//
// `toCloudEvent` (see to-cloud-event.ts) is the only place that bridges
// the two — keep wire-shape knowledge confined there.
//
// References:
//   - https://github.com/datum-cloud/billing/blob/main/docs/enhancements/usage-pipeline.md
//   - https://github.com/datum-cloud/services (MeterDefinition, MonitoredResourceType)

/**
 * A reference to a Milo project. The pipeline uses this to attribute the
 * event to a BillingAccountBinding.
 */
export interface ProjectRef {
  name: string;
}

/**
 * A reference to the resource that emitted the event. Must satisfy the
 * MonitoredResourceType the meter declares as a source.
 *
 * `projectRef` here MUST equal the envelope's top-level `projectRef`
 * (the gateway rejects mismatches at the edge).
 */
export interface ResourceRef {
  projectRef: ProjectRef;
  group: string;
  kind: string;
  namespace: string;
  name: string;
  uid?: string;
}

/**
 * The point-in-time descriptive snapshot of the resource at the moment
 * the event was emitted. Keys must be a subset of the closed label set
 * declared by the resource's MonitoredResourceType.
 */
export type ResourceLabels = Record<string, string>;

/**
 * The full resource block on a usage event.
 */
export interface UsageEventResource {
  ref: ResourceRef;
  labels: ResourceLabels;
}

/**
 * The v0 usage event envelope. JSON-serialisable; no SDK dependency.
 *
 * `eventID` is the end-to-end dedup key — generate it once per logical
 * sample and reuse it on retry. It must parse as a ULID.
 */
export interface UsageEvent {
  eventID: string;
  meterName: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  projectRef: ProjectRef;
  /** Numeric value as a string (matches the wire spec). */
  value: string;
  /** Pricing-axis dimensions; keys must match the MeterDefinition. */
  dimensions: Record<string, string>;
  resource: UsageEventResource;
}

/**
 * CloudEvents v1.0 envelope as required by the billing Ingestion Gateway.
 *
 * Field rules enforced gateway-side:
 *   - `id` must be a valid ULID
 *   - `specversion` is always `"1.0"`
 *   - `type` is the meter name (e.g. `assistant.miloapis.com/conversation/messages`)
 *   - `source` is a URI identifying the producer
 *   - `subject` must be `projects/{name}` — the pipeline keys
 *     attribution off this; do not put project info in `data`
 *   - `datacontenttype` must be exactly `application/json`
 *   - `data.value` must be a base-10 INT64 string
 *
 * `data.dimensions` and `data.resource` are optional but expected for
 * meters whose MeterDefinition declares dimensions or a monitored
 * resource type.
 */
export interface CloudEvent {
  id: string;
  specversion: '1.0';
  type: string;
  source: string;
  subject: string;
  datacontenttype: 'application/json';
  time: string;
  data: CloudEventData;
}

export interface CloudEventData {
  value: string;
  dimensions?: Record<string, string>;
  resource?: CloudEventResource;
}

export interface CloudEventResource {
  group: string;
  kind: string;
  namespace: string;
  name: string;
  uid?: string;
}
