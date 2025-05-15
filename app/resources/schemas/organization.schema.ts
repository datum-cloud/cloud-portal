import { z } from 'zod'

export const organizationMetadataSchema = z.object({
  name: z
    .string({ required_error: 'Name is required.' })
    .min(6, { message: 'Name must be at least 6 characters long.' })
    .max(30, { message: 'Name must be less than 30 characters long.' })
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
      message:
        'Name must be kebab-case, start with a letter, and end with a letter or number',
    }),
  labels: z.array(z.string()).optional(),
  annotations: z.array(z.string()).optional(),
})

export const organizationSchema = z
  .object({
    description: z
      .string({ required_error: 'Description is required.' })
      .max(100, { message: 'Description must be less than 100 characters long.' }),
  })
  .and(organizationMetadataSchema)

export type OrganizationSchema = z.infer<typeof organizationSchema>
