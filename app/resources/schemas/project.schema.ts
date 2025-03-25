import { nameSchema } from './general.schema'
import { z } from 'zod'

export const newProjectSchema = z
  .object({
    description: z
      .string({ required_error: 'Description is required.' })
      .max(100, { message: 'Description must be less than 100 characters long.' }),
    orgEntityId: z.string({ required_error: 'Organization ID is required.' }),
    labels: z.array(z.string()).optional(),
  })
  .merge(nameSchema)

export type NewProjectSchema = z.infer<typeof newProjectSchema>
