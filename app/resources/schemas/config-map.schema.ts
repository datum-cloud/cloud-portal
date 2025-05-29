import { createCodeEditorSchema } from '@/components/code-editor/code-editor.types';
import { z } from 'zod';

export const configMapSchema = createCodeEditorSchema('Configuration').transform((data) => {
  return {
    configuration: data.content,
    format: data.format,
  };
});

export const updateConfigMapSchema = z
  .object({
    resourceVersion: z.string({ required_error: 'Resource version is required.' }),
  })
  .and(configMapSchema)
  .transform((data) => {
    return {
      resourceVersion: data.resourceVersion,
      configuration: data.configuration,
      format: data.format,
    };
  });

export type ConfigMapSchema = z.infer<typeof configMapSchema>;
export type UpdateConfigMapSchema = z.infer<typeof updateConfigMapSchema>;
