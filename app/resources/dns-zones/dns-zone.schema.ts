import { resourceMetadataSchema, paginatedResponseSchema } from '@/resources/base/base.schema';
import { createFqdnSchema } from '@/utils/helpers/validation.helper';
import { z } from 'zod';

export const dnsZoneStatusSchema = z.enum(['Ready', 'Pending', 'Deleting', 'Failed']);
export type DnsZoneStatus = z.infer<typeof dnsZoneStatusSchema>;

export const dnsZoneSchema = resourceMetadataSchema.extend({
  domainName: z.string(),
  dnsZoneClassName: z.string(),
  /** Private zones answer only inside a VPC and never have public nameservers. */
  isPrivate: z.boolean(),
  /** The VPC (Network) a Private DNS zone serves, from the zone's network label. */
  networkName: z.string().optional(),
  status: z.any(),
  deletionTimestamp: z.coerce.date().optional(),
});

export type DnsZone = z.infer<typeof dnsZoneSchema>;

export const dnsZoneListSchema = paginatedResponseSchema(dnsZoneSchema);
export type DnsZoneList = z.infer<typeof dnsZoneListSchema>;

export const createDnsZoneSchema = z.object({
  domainName: createFqdnSchema('Zone Name'),
  description: z.string().max(256, 'Description must be at most 256 characters').optional(),
});

export type CreateDnsZoneInput = z.infer<typeof createDnsZoneSchema>;

export const updateDnsZoneSchema = z.object({
  description: z.string().max(256).optional(),
  resourceVersion: z.string(),
});

export type UpdateDnsZoneInput = z.infer<typeof updateDnsZoneSchema>;
