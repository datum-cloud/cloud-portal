import { z } from 'zod'

export const newProjectSchema = z.object({
  name: z
    .string()
    .min(4, { message: 'Project name must be at least 4 characters long' })
    .max(30, { message: 'Project name must be less than 30 characters long' }),
  description: z
    .string()
    .min(1, { message: 'Description is required' })
    .max(100, { message: 'Description must be less than 100 characters long' }),
})

export type NewProjectSchema = z.infer<typeof newProjectSchema>
