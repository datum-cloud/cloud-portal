'use client';

import { useFieldContext as useFieldContextInternal } from '../context/field-context';
import type { FormFieldContextValue } from '../types';

/**
 * Hook to access the current field context
 * Must be used within a Form.Field component
 *
 * @example
 * ```tsx
 * function MyInput() {
 *   const { name, id, errors, required, disabled, fieldMeta } = useFieldContext();
 *
 *   return (
 *     <input
 *       name={name}
 *       id={id}
 *       required={required}
 *       disabled={disabled}
 *       aria-invalid={!!errors?.length}
 *     />
 *   );
 * }
 * ```
 */
export function useFieldContext(): FormFieldContextValue {
  return useFieldContextInternal();
}
