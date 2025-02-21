import { z } from 'zod'

export const newOrganizationSchema = z.object({
  name: z
    .string({ required_error: 'Name is required.' })
    .min(4, { message: 'Name must be at least 4 characters long.' })
    .max(30, { message: 'Name must be less than 30 characters long.' }),
})

export type NewOrganizationSchema = z.infer<typeof newOrganizationSchema>
