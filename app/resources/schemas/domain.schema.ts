import { nameSchema } from '@/resources/schemas/metadata.schema';
import { createFqdnSchema } from '@/utils/helpers/validation.helper';
import { z } from 'zod';

export const domainSchema = z.object({ domain: createFqdnSchema('Domain') }).and(nameSchema);

export type DomainSchema = z.infer<typeof domainSchema>;

const parseDomains = (value: string) =>
  value
    .split('\n')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

const fqdnSchema = createFqdnSchema('Domain');

export const bulkDomainsSchema = z.object({
  domains: z
    .string({ error: 'At least one domain is required' })
    .min(1, 'At least one domain is required')
    .superRefine((value, ctx) => {
      const domains = parseDomains(value);

      if (domains.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'At least one domain is required',
        });
        return;
      }

      // Check for duplicates
      const seen = new Set<string>();
      for (const domain of domains) {
        if (seen.has(domain)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate domain: ${domain}`,
          });
          return;
        }
        seen.add(domain);
      }

      // Validate each domain
      for (const domain of domains) {
        const result = fqdnSchema.safeParse(domain);
        if (!result.success) {
          ctx.addIssue({
            code: 'custom',
            message: result.error.issues[0]?.message ?? `Invalid domain: ${domain}`,
          });
          return;
        }
      }
    })
    .transform((value) => parseDomains(value)),
});

export type BulkDomainsSchema = z.infer<typeof bulkDomainsSchema>;
