/**
 * Decide whether a loader seed should replace React Query cache that a watch
 * may already have updated.
 *
 * Loader snapshots are frozen until the next revalidation. Watches write a
 * newer `resourceVersion` into the same query key. Seeding must not clobber
 * that live object with the stale snapshot, or the UI looks like watches
 * are broken until a full page reload.
 *
 * Arrays and values without a resourceVersion keep the incoming value so list
 * seeds and non-K8s caches behave as before.
 *
 * resourceVersion is compared as a BigInt. Kubernetes documents it as opaque,
 * but etcd assigns it monotonically, which is what the watch vs loader race
 * needs. A restore or API-server migration that reused a lower version would
 * keep the cached object until that query is dropped.
 */
export function preferFresherQueryData<T>(current: T | undefined, incoming: T): T {
  if (current == null) return incoming;

  const currentRv = resourceVersionOf(current);
  const incomingRv = resourceVersionOf(incoming);
  if (currentRv == null || incomingRv == null) return incoming;

  return currentRv > incomingRv ? current : incoming;
}

function resourceVersionOf(value: unknown): bigint | undefined {
  if (typeof value !== 'object' || value == null) return undefined;
  if (!('resourceVersion' in value)) return undefined;
  const raw = (value as { resourceVersion?: unknown }).resourceVersion;
  if (typeof raw !== 'string' || raw.length === 0) return undefined;
  try {
    return BigInt(raw);
  } catch {
    return undefined;
  }
}
