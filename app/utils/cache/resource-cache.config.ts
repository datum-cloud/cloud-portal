import type { ResourceCacheConfig } from './types';

/**
 * Centralized configuration for all resource cache behaviors
 *
 * Each resource type defines:
 * - keyPrefix: Used to namespace cache keys
 * - identifierField: The unique field for identifying resources
 * - getCacheKey: Function to generate the full cache key
 *
 * @example
 * ```typescript
 * const config = RESOURCE_CACHE_CONFIG.dnsZones;
 * const cacheKey = config.getCacheKey(projectId); // "dns-zones:project-123"
 * ```
 */
export const RESOURCE_CACHE_CONFIG = {
  /**
   * Projects cache configuration
   * Key format: "projects:{orgId}"
   * Identifier: project.name
   */
  projects: {
    keyPrefix: 'projects',
    identifierField: 'name',
    getCacheKey: (orgId: string) => `projects:${orgId}`,
  } as ResourceCacheConfig,

  /**
   * DNS Zones cache configuration
   * Key format: "dns-zones:{projectId}"
   * Identifier: dnsZone.id
   */
  dnsZones: {
    keyPrefix: 'dns-zones',
    identifierField: 'id',
    getCacheKey: (projectId: string) => `dns-zones:${projectId}`,
  } as ResourceCacheConfig,

  /**
   * Domains cache configuration
   * Key format: "domains:{projectId}"
   * Identifier: domain.id
   */
  domains: {
    keyPrefix: 'domains',
    identifierField: 'id',
    getCacheKey: (projectId: string) => `domains:${projectId}`,
  } as ResourceCacheConfig,

  /**
   * DNS Records cache configuration
   * Key format: "dns-records:{projectId}:{zoneId}"
   * Identifier: dnsRecord.id
   */
  dnsRecords: {
    keyPrefix: 'dns-records',
    identifierField: 'id',
    getCacheKey: (projectId: string, zoneId: string) => `dns-records:${projectId}:${zoneId}`,
  } as ResourceCacheConfig,
} as const;

/**
 * Type helper to extract resource type from config
 */
export type ResourceType = keyof typeof RESOURCE_CACHE_CONFIG;
