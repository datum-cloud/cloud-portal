import { createFqdnSchema } from '@/utils/helpers/validation.helper';
import { z } from 'zod';

export const domainSchema = z.object({ domain: createFqdnSchema('Domain') });

export type DomainSchema = z.infer<typeof domainSchema>;

const parseDomains = (value: string) =>
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
