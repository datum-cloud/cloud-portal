import { createFqdnSchema } from '@/utils/helpers/validation.helper';
import { z } from 'zod';

export const formDnsZoneSchema = z.object({
  domainName: createFqdnSchema('Zone Name'),
  description: z
    .string()
    .max(256, { message: 'Description must be at most 256 characters' })
    .optional(),
});

export type FormDnsZoneSchema = z.infer<typeof formDnsZoneSchema>;
