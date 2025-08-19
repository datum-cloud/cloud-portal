import { nameSchema } from '@/resources/schemas/metadata.schema';
import { createFqdnSchema } from '@/utils/helpers/validation.helper';
import { z } from 'zod';

export const domainSchema = z.object({ domain: createFqdnSchema('Domain') }).and(nameSchema);

export type DomainSchema = z.infer<typeof domainSchema>;
