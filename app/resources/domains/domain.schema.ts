import { ComDatumapisNetworkingV1AlphaDomain } from '@/modules/control-plane/networking';
import { ControlPlaneStatus } from '@/resources/base';
import { resourceMetadataSchema, paginatedResponseSchema } from '@/resources/base/base.schema';
import { createFqdnSchema } from '@/utils/helpers/validation.helper';
import { z } from 'zod';

// Form validation schemas
export const domainSchema = z.object({ domain: createFqdnSchema('Domain') });

export type DomainSchema = z.infer<typeof domainSchema>;

export const parseDomains = (value: string) =>
  value
    .split(/[\n,]+/)
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

const fqdnSchema = createFqdnSchema('Domain');

export const bulkDomainsSchema = z.object({
  domains: z
    .string({ error: 'At least one domain is required' })
    .superRefine((value, ctx) => {
      const domains = parseDomains(value);

      if (domains.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'At least one domain is required',
        });
        return;
      }

      // Single loop: check duplicates and validate FQDN
      const seen = new Set<string>();
      const duplicates: string[] = [];
      const invalidDomains: string[] = [];

      for (const domain of domains) {
        if (seen.has(domain)) {
          duplicates.push(domain);
        } else {
          seen.add(domain);
          if (!fqdnSchema.safeParse(domain).success) {
            invalidDomains.push(domain);
          }
        }
      }

      // Build combined error message
      const errors: string[] = [];
      if (duplicates.length > 0) {
        errors.push(`Duplicate domains: ${duplicates.join(', ')}`);
      }
      if (invalidDomains.length > 0) {
        errors.push(`Invalid domains: ${invalidDomains.join(', ')}`);
      }

      if (errors.length > 0) {
        ctx.addIssue({
          code: 'custom',
          message: errors.join('. '),
        });
      }
    })
    .transform((value) => parseDomains(value)),
});

export type BulkDomainsSchema = z.infer<typeof bulkDomainsSchema>;

// Domain resource schema (from API)
export const domainResourceSchema = resourceMetadataSchema.omit({ displayName: true }).extend({
  domainName: z.string(),
  status: z.any().optional(),
  desiredRegistrationRefreshAttempt: z.string().optional(),
});

export type Domain = z.infer<typeof domainResourceSchema>;

export const domainListSchema = paginatedResponseSchema(domainResourceSchema);
export type DomainList = z.infer<typeof domainListSchema>;

// Nameserver type (from domain status)
export type DomainNameserver = NonNullable<
  NonNullable<NonNullable<ComDatumapisNetworkingV1AlphaDomain['status']>['nameservers']>[number]
>;

// Registration type (from domain status)
export type DomainRegistration = NonNullable<
  NonNullable<ComDatumapisNetworkingV1AlphaDomain['status']>['registration']
>;

// Legacy aliases for backward compatibility
export type IDnsNameserver = DomainNameserver;
export type IDnsRegistration = DomainRegistration;

// Input types for service operations
export const createDomainInputSchema = z.object({
  domainName: createFqdnSchema('Domain'),
  name: z.string().optional(),
});

export type CreateDomainInput = z.infer<typeof createDomainInputSchema>;

export const updateDomainInputSchema = z.object({
  domainName: createFqdnSchema('Domain'),
  resourceVersion: z.string(),
});

export type UpdateDomainInput = z.infer<typeof updateDomainInputSchema>;

// ============================================================================
// Domain verification status display config
// ============================================================================

export interface DomainStatusConfig {
  /** Badge status key for BadgeStatus component */
  badgeStatus: string;
  /** Display label */
  label: string;
}

export const DOMAIN_VERIFICATION_STATUS: Record<ControlPlaneStatus, DomainStatusConfig> = {
  [ControlPlaneStatus.Success]: { badgeStatus: 'success', label: 'Verified' },
  [ControlPlaneStatus.Pending]: { badgeStatus: 'error', label: 'Unverified' },
  [ControlPlaneStatus.Error]: { badgeStatus: 'error', label: 'Unverified' },
};
