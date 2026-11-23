/**
 * Cap on the in-memory fallbacks the website routes use when Redis is absent.
 * They are keyed per user or session, so without a cap an entry for every
 * visitor who never returns would stay until the process restarts.
 */
export const MEMORY_MAX_ENTRIES = 10_000;

/**
 * Makes room in `map` for one new key. A no-op below `maxEntries`; at the cap
 * it drops every expired entry, then the oldest inserted ones until there is a
 * free slot. Call it before inserting a key the map does not hold yet.
 */
export function makeRoom<V>(
  map: Map<string, V>,
  isExpired: (value: V) => boolean,
  maxEntries: number = MEMORY_MAX_ENTRIES
): void {
  if (map.size < maxEntries) return;

  for (const [key, value] of map) {
    if (isExpired(value)) map.delete(key);
  }

  // A Map iterates in insertion order, so the first key is the oldest.
  for (const key of map.keys()) {
    if (map.size < maxEntries) break;
    map.delete(key);
  }
}
