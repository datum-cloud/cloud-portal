/**
 * Optimistic Cache Management System
 *
 * This module provides a centralized cache management system for handling
 * optimistic UI updates during async operations (create, update, delete).
 *
 * @example
 * ```typescript
 * import { ResourceCache, RESOURCE_CACHE_CONFIG } from '@/utils/cache';
 *
 * const dnsZoneCache = new ResourceCache(
 *   cache,
 *   RESOURCE_CACHE_CONFIG.dnsZones,
 *   RESOURCE_CACHE_CONFIG.dnsZones.getCacheKey(projectId)
 * );
 *
 * await dnsZoneCache.markAsDeleting(zoneId);
 * ```
 */

export { ResourceCache } from './optimistic-cache.helper';
export { RESOURCE_CACHE_CONFIG } from './resource-cache.config';
export type { CachedResource, CacheMetadata, ResourceCacheConfig } from './types';
export type { ResourceType as ConfigResourceType } from './resource-cache.config';
