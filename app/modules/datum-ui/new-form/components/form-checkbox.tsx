'use client';

import { useFieldContext } from '../context/field-context';
import { Checkbox } from '../primitives/checkbox';
import { Label } from '../primitives/label';
import type { FormCheckboxProps } from '../types';
import { useInputControl } from '@conform-to/react';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';

/**
 * Form.Checkbox - Checkbox input component
 *
 * Automatically wired to the parent Form.Field context.
 *
 * @example
 * ```tsx
 * <Form.Field name="terms">
 *   <Form.Checkbox label="I agree to the terms and conditions" />
 * </Form.Field>
 * ```
 */
export function FormCheckbox({ label, disabled, className }: FormCheckboxProps) {
  const { fieldMeta, disabled: fieldDisabled, errors } = useFieldContext();

  const control = useInputControl(fieldMeta as any);
  const isDisabled = disabled ?? fieldDisabled;
  const hasErrors = errors && errors.length > 0;

  // Convert string value to boolean
  const isChecked = control.value === 'on' || control.value === 'true';

  const handleCheckedChange = (checked: boolean) => {
    control.change(checked ? 'on' : '');
  };

  const checkboxId = fieldMeta.id;

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Checkbox
        id={checkboxId}
        name={fieldMeta.name}
        checked={isChecked}
        onCheckedChange={handleCheckedChange}
        disabled={isDisabled}
        aria-invalid={hasErrors || undefined}
        aria-describedby={hasErrors ? `${fieldMeta.id}-error` : undefined}
      />
      {label && (
        <Label
          htmlFor={checkboxId}
          className={cn(
            'cursor-pointer text-sm font-normal',
            isDisabled && 'cursor-not-allowed opacity-70'
          )}>
          {label}
        </Label>
      )}
    </div>
  );
}

FormCheckbox.displayName = 'Form.Checkbox';
