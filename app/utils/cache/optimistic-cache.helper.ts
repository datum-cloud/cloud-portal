import type { CachedResource, CacheMetadata, ResourceCacheConfig } from './types';
import type { Storage } from 'unstorage';

/**
 * Generic cache manager for handling optimistic UI updates
 *
 * This class provides a consistent pattern for managing cached resources
 * during async operations (create, update, delete). It handles:
 * - Optimistic updates (immediate UI feedback)
 * - Cache synchronization with API responses
 * - Rollback on errors
 * - Merge strategy for eventual consistency
 *
 * @example
 * ```typescript
 * const cache = new ResourceCache(context.cache, RESOURCE_CACHE_CONFIG.dnsZones);
 * await cache.markAsDeleting('zone-123');
 * try {
 *   await api.delete('zone-123');
 *   await cache.remove('zone-123');
 * } catch (error) {
 *   await cache.revert('zone-123');
 * }
 * ```
 */
export class ResourceCache<T extends Record<string, any>> {
  constructor(
    private cache: Storage,
    private config: ResourceCacheConfig<T>,
    private cacheKey: string
  ) {}

  /**
   * Retrieves all cached resources for this cache key
   * @returns Array of cached resources or null if not found
   */
  private async getCachedResources(): Promise<CachedResource<T>[] | null> {
    const cached = await this.cache.getItem(this.cacheKey);
    return cached && Array.isArray(cached) ? (cached as CachedResource<T>[]) : null;
  }

  /**
   * Saves resources to cache
   * @param resources - Array of resources to cache
   */
  private async setCachedResources(resources: CachedResource<T>[]): Promise<void> {
    await this.cache.setItem(this.cacheKey, resources);
  }

  /**
   * Marks a resource as undergoing an operation (deleting, creating, updating)
   *
   * This provides immediate UI feedback by adding metadata to the cached resource.
   * The UI can hide, disable, or show loading states based on this metadata.
   *
   * @param resourceId - The unique identifier of the resource
   * @param operation - The operation being performed
   * @returns Promise that resolves when cache is updated
   */
  async markAsProcessing(
    resourceId: string,
    operation: 'deleting' | 'creating' | 'updating'
  ): Promise<void> {
    const cachedResources = await this.getCachedResources();

    if (!cachedResources) {
      return;
    }

    const timestampField = `${operation.replace('ing', '')}edAt` as keyof CacheMetadata;
    const metadata: CacheMetadata = {
      status: operation,
      [timestampField]: new Date().toISOString(),
    };

    const updatedResources = cachedResources.map((resource) =>
      resource[this.config.identifierField as string] === resourceId
        ? { ...resource, _meta: metadata }
        : resource
    );

    await this.setCachedResources(updatedResources);
  }

  /**
   * Marks a resource as being deleted
   *
   * Convenience method for the most common operation - deletion.
   * Adds _meta.status='deleting' to the resource in cache with a minimum TTL.
   *
   * @param resourceId - The unique identifier of the resource
   * @param minTtl - Minimum time (ms) to keep "deleting" status. Default: 60000ms (1 minute)
   */
  async markAsDeleting(resourceId: string, minTtl: number = 60000): Promise<void> {
    const cachedResources = await this.getCachedResources();

    if (!cachedResources) {
      return;
    }

    const metadata: CacheMetadata = {
      status: 'deleting',
      deletedAt: new Date().toISOString(),
      minTtl,
    };

    const updatedResources = cachedResources.map((resource) =>
      resource[this.config.identifierField as string] === resourceId
        ? { ...resource, _meta: metadata }
        : resource
    );

    await this.setCachedResources(updatedResources);
  }

  /**
   * Completely removes a resource from cache
   *
   * Called after successful API deletion to clean up the cache.
   *
   * @param resourceId - The unique identifier of the resource
   */
  async remove(resourceId: string): Promise<void> {
    const cachedResources = await this.getCachedResources();

    if (!cachedResources) {
      return;
    }

    const filteredResources = cachedResources.filter(
      (resource) => resource[this.config.identifierField as string] !== resourceId
    );

    await this.setCachedResources(filteredResources);
  }

  /**
   * Reverts a resource back to its original state
   *
   * Called when an operation fails. Removes the _meta field to restore
   * the resource to normal state in the UI.
   *
   * @param resourceId - The unique identifier of the resource
   */
  async revert(resourceId: string): Promise<void> {
    const cachedResources = await this.getCachedResources();

    if (!cachedResources) {
      return;
    }

    const revertedResources = cachedResources.map((resource) => {
      if (resource[this.config.identifierField as string] === resourceId && resource._meta) {
        const { _meta, ...resourceWithoutMeta } = resource;
        return resourceWithoutMeta;
      }
      return resource;
    });

    await this.setCachedResources(revertedResources as CachedResource<T>[]);
  }

  /**
   * Merges fresh API data with cached metadata
   *
   * This implements eventual consistency for async operations:
   * 1. Fresh API data is the source of truth
   * 2. Cached metadata (_meta) is preserved for resources still processing
   * 3. Resources marked as "deleting" but missing from API are fully deleted
   *
   * Use this in loader functions to handle delayed deletions/updates.
   *
   * @param freshData - Fresh data from the API
   * @returns Merged array with fresh data + cached metadata
   *
   * @example
   * ```typescript
   * // API says resource still exists, but cache says it's deleting
   * const freshData = [{ id: '123', name: 'DNS Zone' }];
   * const merged = await cache.merge(freshData);
   * // Result: [{ id: '123', name: 'DNS Zone', _meta: { status: 'deleting' } }]
   * // UI can hide it even though API still returns it
   * ```
   */
  async merge(freshData: T[]): Promise<CachedResource<T>[]> {
    const cachedResources = await this.getCachedResources();

    if (!cachedResources || !Array.isArray(cachedResources)) {
      // No cache exists, save fresh data and return it
      await this.setCachedResources(freshData);
      return freshData;
    }

    const now = Date.now();

    // Merge: fresh data + cached metadata
    const mergedResources = freshData.map((freshResource) => {
      const cachedResource = cachedResources.find(
        (cached) =>
          cached[this.config.identifierField as string] ===
          freshResource[this.config.identifierField as string]
      );

      // Preserve _meta if resource is still processing
      if (cachedResource?._meta) {
        const meta = cachedResource._meta;

        // Check if TTL has expired (if minTtl is set)
        if (meta.minTtl && meta.deletedAt) {
          const deletedTime = new Date(meta.deletedAt).getTime();
          const elapsed = now - deletedTime;

          // If TTL expired, don't preserve _meta (let API state take over)
          if (elapsed >= meta.minTtl) {
            return freshResource;
          }
        }

        // TTL not expired or not set - preserve _meta
        return { ...freshResource, _meta: meta };
      }

      return freshResource;
    });

    // Always save merged resources to keep cache in sync
    await this.setCachedResources(mergedResources);

    return mergedResources;
  }

  /**
   * Adds a new resource to cache with "creating" metadata
   *
   * Use this for optimistic creation - add the resource to cache
   * immediately while the API call is in progress.
   *
   * @param resource - The resource to add
   */
  async addAsCreating(resource: T): Promise<void> {
    const cachedResources = (await this.getCachedResources()) || [];

    const newResource: CachedResource<T> = {
      ...resource,
      _meta: {
        status: 'creating',
        createdAt: new Date().toISOString(),
      },
    };

    await this.setCachedResources([...cachedResources, newResource]);
  }

  /**
   * Updates the cache after successful creation
   *
   * Replaces the temporary "creating" resource with the API response.
   *
   * @param tempId - Temporary ID used during optimistic creation
   * @param createdResource - The actual resource returned from API
   */
  async replaceCreated(tempId: string, createdResource: T): Promise<void> {
    const cachedResources = await this.getCachedResources();

    if (!cachedResources) {
      return;
    }

    const updatedResources = cachedResources.map((resource) =>
      resource[this.config.identifierField as string] === tempId ? createdResource : resource
    );

    await this.setCachedResources(updatedResources);
  }

  /**
   * Cleans up stale operations based on TTL (Time To Live)
   *
   * Removes resources that have been in a processing state for too long.
   * Useful for handling edge cases where operations fail silently.
   *
   * @param ttlMinutes - Time in minutes before considering an operation stale
   */
  async cleanupStaleOperations(ttlMinutes: number = 5): Promise<void> {
    const cachedResources = await this.getCachedResources();

    if (!cachedResources) {
      return;
    }

    const now = new Date();
    const cleanedResources = cachedResources
      .map((resource) => {
        if (!resource._meta) {
          return resource;
        }

        const timestamp =
          resource._meta.deletedAt || resource._meta.createdAt || resource._meta.updatedAt;

        if (!timestamp) {
          return resource;
        }

        const operationTime = new Date(timestamp);
        const minutesElapsed = (now.getTime() - operationTime.getTime()) / 1000 / 60;

        // If operation is stale, remove metadata
        if (minutesElapsed > ttlMinutes) {
          const { _meta, ...resourceWithoutMeta } = resource;
          return resourceWithoutMeta;
        }

        return resource;
      })
      .filter((resource) => {
        // Remove resources that are still marked as deleting after TTL
        if (resource._meta?.status === 'deleting') {
          const timestamp = resource._meta.deletedAt;
          if (timestamp) {
            const operationTime = new Date(timestamp);
            const minutesElapsed = (now.getTime() - operationTime.getTime()) / 1000 / 60;
            return minutesElapsed <= ttlMinutes;
          }
        }
        return true;
      });

    await this.setCachedResources(cleanedResources as CachedResource<T>[]);
  }
}
