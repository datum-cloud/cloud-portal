// app/modules/usage/types.ts
//
// Wire-format types for the Milo durable usage pipeline.
//
// These mirror the envelope defined in the billing service's
// `docs/usage-pipeline` enhancement. The pipeline does not yet exist in
// production; until USAGE_GATEWAY_URL is configured, the emitter is a
// no-op. When v0 of the Ingestion Gateway lands, no shape changes here
// should be necessary — only configuration.
//
// References:
//   - https://github.com/datum-cloud/billing/blob/docs/usage-pipeline/docs/enhancements/usage-pipeline.md
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
