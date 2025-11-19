/**
 * Metadata attached to cached resources to track transient states
 * Used for optimistic UI updates during async operations
 */
export interface CacheMetadata {
  /**
   * Current operation status of the resource
   * - deleting: Resource deletion is in progress
   * - creating: Resource creation is in progress
   * - updating: Resource update is in progress
   */
  status: 'deleting' | 'creating' | 'updating';

  /**
   * ISO timestamp when the deletion was initiated
   */
  deletedAt?: string;

  /**
   * ISO timestamp when the creation was initiated
   */
  createdAt?: string;

  /**
   * ISO timestamp when the update was initiated
   */
  updatedAt?: string;

  /**
   * Minimum time (in milliseconds) to keep this status, regardless of API state
   * Used to prevent flickering when API returns stale data during async operations
   *
   * Example: Keep "deleting" status for 60000ms (1 minute) even if API still returns the item
   */
  minTtl?: number;
}

/**
 * Generic cached resource type with optional metadata
 * The _meta field is used to track optimistic UI states
 */
export type CachedResource<T = any> = T & {
  _meta?: CacheMetadata;
};

/**
 * Configuration for a specific resource type's cache behavior
 */
export interface ResourceCacheConfig<T = any> {
  /**
   * Prefix used for cache keys (e.g., 'projects', 'dns-zones')
   */
  keyPrefix: string;

  /**
   * The field name used to uniquely identify resources
   * (e.g., 'name' for projects, 'id' for DNS zones)
   */
  identifierField: keyof T;

  /**
   * Function to generate the full cache key
   * @param args - Arguments needed to construct the key (e.g., orgId, projectId)
   * @returns The complete cache key string
   */
  getCacheKey: (...args: string[]) => string;
}
