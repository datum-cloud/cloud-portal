import { isValidJson, isValidYaml } from '@/utils/editor';
import { z } from 'zod';

export type EditorLanguage = string;

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: EditorLanguage;
  id?: string;
  name?: string;
  error?: string;
  className?: string;
  readOnly?: boolean;
  minHeight?: string;
}

export interface CodeEditorTabsProps {
  /** The current value in the editor's preferred format */
  value: string;
  /** Called when the value changes */
  onChange?: (value: string, format: EditorLanguage) => void;
  /** The format to use (json or yaml) */
  format?: EditorLanguage;
  /** Called when the format changes */
  onFormatChange?: (format: EditorLanguage) => void;
  /** Error message to display */
  error?: string;
  /** ID of the field (for form integration) */
  id?: string;
  /** Name of the field (for form integration) */
  name?: string;
  /** Minimum height of the editor */
  minHeight?: string;
}

export const jsonSchema = z.object({
  jsonContent: z
    .string({ required_error: 'JSON content is required' })
    .refine(isValidJson, { message: 'Invalid JSON format' }),
});

export const yamlSchema = z.object({
  yamlContent: z
    .string({ required_error: 'YAML content is required' })
    .refine(isValidYaml, { message: 'Invalid YAML format' }),
});

/**
 * Common schema for validating a field that could be either JSON or YAML
 * based on format specification
 */
export function createCodeEditorSchema(name: string = 'Content') {
  return z
    .object({
      // The actual content
      content: z.string({ required_error: `${name} is required` }).min(1, `${name} is required`),
      // The format identifier (json or yaml)
      format: z.enum(['json', 'yaml']),
    })
    .refine(
      (data) => {
        // Validate based on the specified format
        if (data.format === 'json') {
          return isValidJson(data?.content as string);
        } else {
          return isValidYaml(data?.content as string);
        }
      },
      {
        // Error message and path for the refinement rule
        message: `Invalid ${name} format`,
        path: ['content'],
      }
    );
}

export type JsonFormValues = z.infer<typeof jsonSchema>;
export type YamlFormValues = z.infer<typeof yamlSchema>;
