// app/resources/search/search.constants.ts
import type { SearchTarget } from './search.schema';

/**
 * Kinds searchable from the project surfaces (cmd-K, project bar, mobile sheet).
 *
 * Only kinds with a deployed ResourceIndexPolicy in milo-os/search are listed.
 * After milo-os/search PR #95 the apiserver soft-degrades unknown kinds into
 * `status.deniedTargetResources` rather than 422-ing the whole request, so a
 * missing policy is no longer fatal — but we still keep the list tight to
 * avoid a partial-permission banner on every query.
 *
 * Each GVK below is cross-checked against the generated control-plane SDK
 * (`app/modules/control-plane/<group>/schemas.gen.ts`) so the kind casing
 * and API version match what milo serves.
 *
 * Disabled (no ResourceIndexPolicy yet in datum-cloud/datum):
 *   { group: 'dns.networking.miloapis.com', version: 'v1alpha1', kind: 'DnsRecordSet' }
 *   { group: 'core', version: 'v1', kind: 'Secret' }
 *   { group: 'iam.miloapis.com', version: 'v1alpha1', kind: 'ServiceAccount' }
 */
export const PROJECT_KINDS: SearchTarget[] = [
  { group: 'networking.datumapis.com', version: 'v1alpha', kind: 'Domain' },
  { group: 'networking.datumapis.com', version: 'v1alpha', kind: 'HTTPProxy' },
  { group: 'dns.networking.miloapis.com', version: 'v1alpha1', kind: 'DNSZone' },
  { group: 'telemetry.miloapis.com', version: 'v1alpha1', kind: 'ExportPolicy' },
];

/** Max recent queries / hits stored in localStorage per scope. */
export const RECENTS_CAPS = { queries: 10, hits: 5 } as const;

/** Cap on hits shown per kind group in search results. */
export const GROUP_RESULT_CAP = 5;

/** Debounce delay for the search input, in ms. */
export const SEARCH_DEBOUNCE_MS = 250;
