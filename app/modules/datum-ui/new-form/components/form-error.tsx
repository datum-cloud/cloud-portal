'use client';

import * as React from 'react';
import { cn } from '@shadcn/lib/utils';
import { useFieldContext, useOptionalFieldContext } from '../context/field-context';
import type { FormErrorProps } from '../types';

/**
 * Form.Error - Display field errors
 *
 * Can be used inside Form.Field to display errors automatically,
 * or standalone with custom rendering.
 *
 * @example
 * ```tsx
 * // Inside Form.Field - displays field errors automatically
 * <Form.Field name="email">
 *   <Form.Input />
 *   <Form.Error />
 * </Form.Field>
 *
 * // Custom rendering
 * <Form.Field name="email">
 *   <Form.Input />
 *   <Form.Error>
 *     {(errors) => errors.map(e => <span key={e}>{e}</span>)}
 *   </Form.Error>
 * </Form.Field>
 * ```
 */
export function FormError({ children, className }: FormErrorProps) {
  const fieldContext = useOptionalFieldContext();
  const errors = fieldContext?.errors;

  if (!errors || errors.length === 0) {
    return null;
  }

  // Custom render function
  if (typeof children === 'function') {
    return <>{children(errors)}</>;
  }

  // Default rendering
  return (
    <ul
      className={cn(
        'text-destructive space-y-1 text-sm font-medium',
        errors.length > 1 && 'list-disc pl-4',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {errors.map((error) => (
        <li key={error} className="text-wrap">
          {error}
        </li>
      ))}
    </ul>
  );
}

FormError.displayName = 'Form.Error';
