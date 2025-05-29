import { nameSchema } from './metadata.schema';
import { z } from 'zod';

export const newNetworkSchema = z
  .object({
    ipFamily: z.enum(['IPv4', 'IPv6'], {
      required_error: 'IP family is required.',
    }),
    ipam: z.enum(['Auto'], {
      required_error: 'IPAM is required.',
    }),
    mtu: z.coerce
      .number({
        required_error: 'MTU is required.',
      })
      .min(1300, { message: 'MTU must be at least 1300.' })
      .max(8856, { message: 'MTU must be less than 8856.' })
      .transform((val) => Number(val)),
  })
  .merge(nameSchema);

export const updateNetworkSchema = newNetworkSchema.extend({
  resourceVersion: z.string({ required_error: 'Resource version is required.' }),
});

export type NewNetworkSchema = z.infer<typeof newNetworkSchema>;
export type UpdateNetworkSchema = z.infer<typeof updateNetworkSchema>;
