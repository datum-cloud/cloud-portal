'use client';

import * as React from 'react';
import { getInputProps } from '@conform-to/react';
import { cn } from '@shadcn/lib/utils';
import { useFieldContext } from '../context/field-context';
import { Input } from '../primitives/input';
import type { FormInputProps } from '../types';

/**
 * Form.Input - Text input component
 *
 * Automatically wired to the parent Form.Field context.
 *
 * @example
 * ```tsx
 * <Form.Field name="email" label="Email" required>
 *   <Form.Input type="email" placeholder="john@example.com" />
 * </Form.Field>
 * ```
 */
export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ type = 'text', className, disabled, ...props }, ref) => {
    const { fieldMeta, disabled: fieldDisabled, errors } = useFieldContext();

    const inputProps = getInputProps(fieldMeta, { type });
    const isDisabled = disabled ?? fieldDisabled;
    const hasErrors = errors && errors.length > 0;

    return (
      <Input
        ref={ref}
        {...inputProps}
        {...props}
        type={type}
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

FormInput.displayName = 'Form.Input';
