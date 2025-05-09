import { z } from 'zod'

// Project metadata schema (without the generic name schema)
export const projectMetadataSchema = z.object({
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

export const newProjectSchema = z
  .object({
    description: z
      .string({ required_error: 'Description is required.' })
      .max(100, { message: 'Description must be less than 100 characters long.' }),
    orgEntityId: z.string({ required_error: 'Organization ID is required.' }),
  })
  .and(projectMetadataSchema)

export type NewProjectSchema = z.infer<typeof newProjectSchema>
