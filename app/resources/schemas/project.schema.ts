import { z } from 'zod'

export const newProjectSchema = z.object({
  name: z
    .string({ required_error: 'Project name is required.' })
    .min(4, { message: 'Project name must be at least 4 characters long.' })
    .max(30, { message: 'Project name must be less than 30 characters long.' })
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
      message:
        'Project name must be kebab-case, start with a letter, and end with a letter or number',
    }),
  description: z
    .string({ required_error: 'Description is required.' })
    .max(100, { message: 'Description must be less than 100 characters long.' }),
  orgEntityId: z.string({ required_error: 'Organization ID is required.' }),
})

export type NewProjectSchema = z.infer<typeof newProjectSchema>
