// app/resources/search/search.schema.ts
import { z } from 'zod';

export const searchTargetSchema = z.object({
  group: z.string(),
  version: z.string(),
  kind: z.string(),
});
export type SearchTarget = z.infer<typeof searchTargetSchema>;

export const searchInputSchema = z.object({
  query: z.string(),
  targetResources: z.array(searchTargetSchema),
  limit: z.number().int().positive().max(100).optional(),
  continueToken: z.string().optional(),
});
export type SearchInput = z.infer<typeof searchInputSchema>;

export const searchHitTenantSchema = z.object({
  name: z.string(),
  type: z.string(),
});
export type SearchHitTenant = z.infer<typeof searchHitTenantSchema>;

export const searchHitSchema = z.object({
  uid: z.string(),
  name: z.string(),
  /** Human-readable primary text (e.g. spec.domainName for Domain/DNSZone). Optional. */
  displayName: z.string().optional(),
  /** Secondary descriptive text from annotations or similar. Optional. */
  description: z.string().optional(),
  namespace: z.string().optional(),
  apiVersion: z.string(),
  kind: z.string(),
  relevanceScore: z.number(),
  tenant: searchHitTenantSchema,
});
export type SearchHit = z.infer<typeof searchHitSchema>;

export const searchResultSchema = z.object({
  hits: z.array(searchHitSchema),
  nextContinueToken: z.string().optional(),
  deniedKinds: z.array(searchTargetSchema).default([]),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

export type SearchHitGroup = {
  kind: string;
  hits: SearchHit[];
  hasMore: boolean;
};
