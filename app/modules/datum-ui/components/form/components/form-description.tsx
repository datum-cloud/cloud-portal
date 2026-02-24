import { useOptionalFieldContext } from '../context/field-context';
import type { FormDescriptionProps } from '../types';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';

/**
 * Form.Description - Display field description/helper text
 *
 * @example
 * ```tsx
 * <Form.Field name="password">
 *   <Form.Input type="password" />
 *   <Form.Description>
 *     Must be at least 8 characters with one uppercase letter
 *   </Form.Description>
 * </Form.Field>
 * ```
 */
export function FormDescription({ children, className }: FormDescriptionProps) {
  const fieldContext = useOptionalFieldContext();
  const id = fieldContext ? `${fieldContext.id}-description` : undefined;

  return (
    <p id={id} className={cn('text-muted-foreground text-xs text-wrap', className)}>
      {children}
    </p>
  );
}

FormDescription.displayName = 'Form.Description';
