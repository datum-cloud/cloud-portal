import { metadataSchema } from './metadata.schema'
import { SecretType } from '@/resources/interfaces/secret.interface'
import { z } from 'zod'

export const secretEnvSchema = z.object({
  key: z
    .string({ required_error: 'Key is required' })
    .min(1, { message: 'Key is required' })
    .max(63, { message: 'Key must be at most 63 characters long.' })
    .regex(/^[a-zA-Z0-9._-]+$/, {
      message: 'Key must only contain letters, numbers, dots, underscores, or hyphens',
    }),
  value: z
    .string({ required_error: 'Value is required' })
    .min(1, { message: 'Value is required' }),
})

export const secretVariablesSchema = z.object({
  variables: z.array(secretEnvSchema).min(1, {
    message: 'At least one secret entry is required',
  }),
})

export const secretSchema = z
  .object({
    type: z.enum(Object.values(SecretType) as [string, ...string[]], {
      required_error: 'Type is required.',
    }),
  })
  .and(secretVariablesSchema)
  .and(metadataSchema)
  .superRefine((data, ctx) => {
    const keys = new Set<string>()
    data?.variables?.forEach((variable, index) => {
      const name = variable.key?.trim()
      if (name) {
        if (keys.has(name)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Key "${name}" is already used`,
            path: ['variables', index, 'key'],
          })
        } else {
          keys.add(name)
        }
      }
    })
  })

export type SecretEnvSchema = z.infer<typeof secretEnvSchema>
export type SecretVariablesSchema = z.infer<typeof secretVariablesSchema>
export type SecretSchema = z.infer<typeof secretSchema>
