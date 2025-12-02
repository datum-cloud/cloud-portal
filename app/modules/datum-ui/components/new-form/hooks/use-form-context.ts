import { useFormContext as useFormContextInternal } from '../context/form-context';
import type { FormContextValue } from '../types';

/**
 * Hook to access the form context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { form, fields, isSubmitting, submit, reset } = useFormContext();
 *
 *   return (
 *     <button onClick={submit} disabled={isSubmitting}>
 *       Submit
 *     </button>
 *   );
 * }
 * ```
 */
export function useFormContext<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): FormContextValue<T> {
  return useFormContextInternal<T>();
}
