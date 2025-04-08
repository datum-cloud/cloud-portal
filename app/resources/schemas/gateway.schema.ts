import { createCodeEditorSchema } from '@/components/code-editor/code-editor.types'
import { z } from 'zod'

export const gatewaySchema = createCodeEditorSchema('Configuration').transform((data) => {
  return {
    configuration: data.content,
    format: data.format,
  }
})

export const updateGatewaySchema = z
  .object({
    resourceVersion: z.string({ required_error: 'Resource version is required.' }),
  })
  .and(gatewaySchema)
  .transform((data) => {
    return {
      resourceVersion: data.resourceVersion,
      configuration: data.configuration,
      format: data.format,
    }
  })

export type GatewaySchema = z.infer<typeof gatewaySchema>
export type UpdateGatewaySchema = z.infer<typeof updateGatewaySchema>
