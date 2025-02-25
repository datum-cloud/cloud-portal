import { z } from 'zod'

export const newNetworkSchema = z.object({
  displayName: z
    .string({ required_error: 'Display name is required.' })
    .max(100, { message: 'Display name must be less than 100 characters long.' }),
  name: z
    .string({ required_error: 'Name is required.' })
    .min(6, { message: 'Name must be at least 6 characters long.' })
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
      message:
        'Name must be kebab-case, start with a letter, and end with a letter or number',
    }),
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

export const updateNetworkSchema = newNetworkSchema.extend({
  resourceVersion: z.string({ required_error: 'Resource version is required.' }),
})

export type NewNetworkSchema = z.infer<typeof newNetworkSchema>
export type UpdateNetworkSchema = z.infer<typeof updateNetworkSchema>
