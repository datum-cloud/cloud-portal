import { createCodeEditorSchema } from '@/components/code-editor/code-editor.types'
import { z } from 'zod'

export const exportPolicySchema = createCodeEditorSchema('Configuration').transform(
  (data) => {
    return {
      configuration: data.content,
      format: data.format,
    }
  },
)

export const updateExportPolicySchema = z
  .object({
    resourceVersion: z.string({ required_error: 'Resource version is required.' }),
  })
  .and(exportPolicySchema)
  .transform((data) => {
    return {
      resourceVersion: data.resourceVersion,
      configuration: data.configuration,
      format: data.format,
    }
  })

export type ExportPolicySchema = z.infer<typeof exportPolicySchema>
export type UpdateExportPolicySchema = z.infer<typeof updateExportPolicySchema>
