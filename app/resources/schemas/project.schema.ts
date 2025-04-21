import { metadataSchema } from './metadata.schema'
import { z } from 'zod'

export const newProjectSchema = z
  .object({
    description: z
      .string({ required_error: 'Description is required.' })
      .max(100, { message: 'Description must be less than 100 characters long.' }),
    orgEntityId: z.string({ required_error: 'Organization ID is required.' }),
  })
  .and(metadataSchema)

export type NewProjectSchema = z.infer<typeof newProjectSchema>
