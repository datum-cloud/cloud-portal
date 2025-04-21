import { nameSchema } from './metadata.schema'
import { z } from 'zod'

export const newOrganizationSchema = nameSchema

export type NewOrganizationSchema = z.infer<typeof newOrganizationSchema>
