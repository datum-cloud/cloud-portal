'use client';

import * as React from 'react';
import { getTextareaProps } from '@conform-to/react';
import { cn } from '@shadcn/lib/utils';
import { useFieldContext } from '../context/field-context';
import { Textarea } from '../primitives/textarea';
import type { FormTextareaProps } from '../types';

/**
 * Form.Textarea - Multi-line text input component
 *
 * Automatically wired to the parent Form.Field context.
 *
 * @example
 * ```tsx
 * <Form.Field name="bio" label="Bio">
 *   <Form.Textarea rows={4} placeholder="Tell us about yourself..." />
 * </Form.Field>
 * ```
 */
export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, disabled, rows = 3, ...props }, ref) => {
    const { fieldMeta, disabled: fieldDisabled, errors } = useFieldContext();

    const textareaProps = getTextareaProps(fieldMeta);
    const isDisabled = disabled ?? fieldDisabled;
    const hasErrors = errors && errors.length > 0;

    return (
      <Textarea
        ref={ref}
        {...textareaProps}
        {...props}
        rows={rows}
        disabled={isDisabled}
        aria-invalid={hasErrors || undefined}
        aria-describedby={
          hasErrors ? `${fieldMeta.id}-error` : undefined
        }
        className={cn(className)}
      />
    );
  }
);

FormTextarea.displayName = 'Form.Textarea';
