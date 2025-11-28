'use client';

import * as React from 'react';
import { useInputControl } from '@conform-to/react';
import { cn } from '@shadcn/lib/utils';
import { useFieldContext } from '../context/field-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../primitives/select';
import type { FormSelectProps, FormSelectItemProps } from '../types';

/**
 * Form.Select - Select dropdown component
 *
 * Automatically wired to the parent Form.Field context.
 *
 * @example
 * ```tsx
 * <Form.Field name="country" label="Country" required>
 *   <Form.Select placeholder="Select a country">
 *     <Form.SelectItem value="us">United States</Form.SelectItem>
 *     <Form.SelectItem value="uk">United Kingdom</Form.SelectItem>
 *     <Form.SelectItem value="ca">Canada</Form.SelectItem>
 *   </Form.Select>
 * </Form.Field>
 * ```
 */
export function FormSelect({
  placeholder,
  disabled,
  className,
  children,
}: FormSelectProps) {
  const { fieldMeta, disabled: fieldDisabled, errors } = useFieldContext();

  const control = useInputControl(fieldMeta as any);
  const isDisabled = disabled ?? fieldDisabled;
  const hasErrors = errors && errors.length > 0;

  // Ensure value is always a string for Select
  const selectValue = Array.isArray(control.value) ? control.value[0] : control.value;

  return (
    <Select
      name={fieldMeta.name}
      value={selectValue ?? ''}
      onValueChange={control.change}
      disabled={isDisabled}
    >
      <SelectTrigger
        id={fieldMeta.id}
        aria-invalid={hasErrors || undefined}
        aria-describedby={hasErrors ? `${fieldMeta.id}-error` : undefined}
        className={cn(className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
}

FormSelect.displayName = 'Form.Select';

/**
 * Form.SelectItem - Individual select option
 *
 * @example
 * ```tsx
 * <Form.SelectItem value="option1">Option 1</Form.SelectItem>
 * ```
 */
export function FormSelectItem({
  value,
  children,
  disabled,
}: FormSelectItemProps) {
  return (
    <SelectItem value={value} disabled={disabled}>
      {children}
    </SelectItem>
  );
}

FormSelectItem.displayName = 'Form.SelectItem';
