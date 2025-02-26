import { z } from 'zod'

export const newApiKeySchema = z.object({
  name: z
    .string({ required_error: 'Name is required.' })
    .min(6, { message: 'Name must be at least 6 characters long.' }),
  description: z.string().optional(),
  expiresAt: z.union([z.coerce.number(), z.coerce.date(), z.string()]).optional(),
  ownerId: z.string().optional(),
  orgIds: z.array(z.string()).optional(),
})

export type NewApiKeySchema = z.infer<typeof newApiKeySchema>
