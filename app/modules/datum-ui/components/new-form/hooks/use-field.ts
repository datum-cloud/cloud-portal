import { useFormContext } from '../context/form-context';
import type { UseFieldReturn } from '../types';
import { useInputControl } from '@conform-to/react';
import * as React from 'react';

/**
 * Hook to access and control a specific field
 * Provides field metadata, control methods, and errors
 *
 * @example
 * ```tsx
 * function MyCustomInput({ name }: { name: string }) {
 *   const { field, control, meta, errors } = useField(name);
 *
 *   return (
 *     <div>
 *       <input
 *         name={meta.name}
 *         id={meta.id}
 *         value={control.value ?? ''}
 *         onChange={(e) => control.change(e.target.value)}
 *         onBlur={control.blur}
 *         aria-invalid={!!errors?.length}
 *       />
 *       {errors?.map((error) => (
 *         <span key={error} className="text-red-500">{error}</span>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useField(name: string): UseFieldReturn {
  const { fields } = useFormContext();

  // Get the field metadata - support nested paths
  const field = React.useMemo(() => {
    const parts = name.split('.');
    let current: any = fields;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current) break;

      // Handle array access like "items.0.name"
      if (/^\d+$/.test(part)) {
        const fieldList = current.getFieldList?.();
        if (fieldList) {
          const item = fieldList[parseInt(part, 10)];
          // If there are more parts, get the fieldset
          if (i < parts.length - 1 && item?.getFieldset) {
            current = item.getFieldset();
          } else {
            current = item;
          }
        } else {
          current = current[part];
        }
      } else {
        // First check if it's a direct property (top-level field)
        if (current[part] !== undefined) {
          current = current[part];
        } else if (typeof current.getFieldset === 'function') {
          // Try getFieldset for nested objects
          current = current.getFieldset()[part];
        } else {
          current = undefined;
        }
      }
    }

    return current;
  }, [fields, name]);

  if (!field) {
    throw new Error(
      `Field "${name}" not found in form. Make sure the field name matches your schema.`
    );
  }

  const control = useInputControl(field as any);

  // Ensure value is a string (not string[])
  const controlValue = Array.isArray(control.value) ? control.value[0] : control.value;

  const meta = React.useMemo(
    () => ({
      name: field.name,
      id: field.id,
      errors: field.errors,
      required: field.required ?? false,
      disabled: field.disabled ?? false,
    }),
    [field.name, field.id, field.errors, field.required, field.disabled]
  );

  return {
    field,
    control: {
      value: controlValue,
      change: control.change,
      blur: control.blur,
      focus: control.focus,
    },
    meta,
    errors: field.errors,
  };
}
