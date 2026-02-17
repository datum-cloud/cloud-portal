import { useFormContext } from '../context/form-context';
import { useInputControl } from '@conform-to/react';
import * as React from 'react';

/**
 * Hook to watch a field's value
 * Triggers re-render when the watched field value changes
 *
 * @example
 * ```tsx
 * function ConditionalField() {
 *   const contactMethod = useWatch('contactMethod');
 *
 *   if (contactMethod === 'email') {
 *     return <Form.Field name="email"><Form.Input type="email" /></Form.Field>;
 *   }
 *
 *   if (contactMethod === 'phone') {
 *     return <Form.Field name="phone"><Form.Input type="tel" /></Form.Field>;
 *   }
 *
 *   return null;
 * }
 * ```
 */
export function useWatch<T = unknown>(name: string): T | undefined {
  const { fields } = useFormContext();

  // Get the field metadata - support nested paths
  const field = React.useMemo(() => {
    const parts = name.split('.');
    let current: any = fields;

    for (const part of parts) {
      if (!current) break;

      // Handle array access like "items.0.name"
      if (/^\d+$/.test(part)) {
        const fieldList = current.getFieldList?.();
        if (fieldList) {
          const fieldset = fieldList[parseInt(part, 10)]?.getFieldset?.();
          current = fieldset;
        } else {
          current = current[part];
        }
      } else {
        // Try getFieldset for nested objects
        if (typeof current.getFieldset === 'function') {
          current = current.getFieldset()[part];
        } else {
          current = current[part];
        }
      }
    }

    return current;
  }, [fields, name]);

  // Use input control to get reactive value
  const control = useInputControl(field);

  return control.value as T | undefined;
}

/**
 * Hook to watch multiple fields at once
 *
 * @example
 * ```tsx
 * function Summary() {
 *   const values = useWatchAll(['firstName', 'lastName', 'email']);
 *
 *   return (
 *     <div>
 *       Name: {values.firstName} {values.lastName}
 *       Email: {values.email}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWatchAll<T extends Record<string, unknown>>(names: string[]): Partial<T> {
  const { fields } = useFormContext();

  return React.useMemo(() => {
    const result: Record<string, unknown> = {};

    for (const name of names) {
      const parts = name.split('.');
      let current: any = fields;

      for (const part of parts) {
        if (!current) break;

        if (/^\d+$/.test(part)) {
          const fieldList = current.getFieldList?.();
          if (fieldList) {
            const fieldset = fieldList[parseInt(part, 10)]?.getFieldset?.();
            current = fieldset;
          } else {
            current = current[part];
          }
        } else {
          if (typeof current.getFieldset === 'function') {
            current = current.getFieldset()[part];
          } else {
            current = current[part];
          }
        }
      }

      if (current) {
        result[name] = current.value;
      }
    }

    return result as Partial<T>;
  }, [fields, names]);
}
