/**
 * Shared builders for raw Kubernetes-style API objects used by resource
 * adapter tests.
 *
 * Adapters all consume the same envelope shape (`metadata` / `spec` /
 * `status`), so these helpers keep adapter specs terse and consistent and
 * give us one place to evolve the fixture shape as the API changes.
 *
 * Test-only: never import this from application code. It is tree-shaken out
 * of production builds because nothing in `app/` (outside `*.test.ts`)
 * references it.
 */

export interface RawMetadataOverrides {
  uid?: string;
  name?: string;
  namespace?: string;
  resourceVersion?: string;
  creationTimestamp?: string;
  deletionTimestamp?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

/**
 * A populated metadata block with sensible, deterministic defaults. Pass
 * overrides for the fields a given test cares about.
 */
export function rawMetadata(overrides: RawMetadataOverrides = {}) {
  return {
    uid: 'uid-1',
    name: 'res-1',
    namespace: 'ns-1',
    resourceVersion: '100',
    creationTimestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export interface RawResourceOptions {
  apiVersion?: string;
  kind?: string;
  metadata?: RawMetadataOverrides;
  spec?: Record<string, unknown>;
  status?: Record<string, unknown>;
}

/**
 * A raw single-resource envelope. `spec`/`status` are only included when
 * provided so tests can assert on absent-field defaulting.
 */
export function rawResource({ apiVersion, kind, metadata, spec, status }: RawResourceOptions = {}) {
  return {
    ...(apiVersion ? { apiVersion } : {}),
    ...(kind ? { kind } : {}),
    metadata: rawMetadata(metadata),
    ...(spec ? { spec } : {}),
    ...(status ? { status } : {}),
  };
}

/**
 * A raw list envelope. Adapters read the pagination cursor from
 * `metadata.continue`, so it is only set when a token is supplied.
 */
export function rawList<T>(items: T[], opts: { continue?: string } = {}) {
  return {
    items,
    metadata: opts.continue ? { continue: opts.continue } : {},
  };
}

/**
 * A control-plane status whose conditions resolve to "ready/success" under
 * `transformControlPlaneStatus` (all required conditions are `True`).
 */
export function readyStatus() {
  return { conditions: [{ type: 'Ready', status: 'True' }] };
}

/**
 * A control-plane status that resolves to "pending" (condition not yet met).
 */
export function pendingStatus(message = 'not ready yet') {
  return { conditions: [{ type: 'Ready', status: 'False', message }] };
}
