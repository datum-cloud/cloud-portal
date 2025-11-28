'use client';

import * as React from 'react';
import { useInputControl } from '@conform-to/react';
import { cn } from '@shadcn/lib/utils';
import { useFieldContext } from '../context/field-context';
import { RadioGroup, RadioGroupItem } from '../primitives/radio-group';
import { Label } from '../primitives/label';
import type { FormRadioGroupProps, FormRadioItemProps } from '../types';

/**
 * Form.RadioGroup - Radio button group component
 *
 * Automatically wired to the parent Form.Field context.
 *
 * @example
 * ```tsx
 * <Form.Field name="plan" label="Select Plan" required>
 *   <Form.RadioGroup orientation="vertical">
 *     <Form.RadioItem value="free" label="Free" description="Basic features" />
 *     <Form.RadioItem value="pro" label="Pro" description="Advanced features" />
 *     <Form.RadioItem value="enterprise" label="Enterprise" description="Custom solutions" />
 *   </Form.RadioGroup>
 * </Form.Field>
 * ```
 */
export function FormRadioGroup({
  orientation = 'vertical',
  disabled,
  className,
  children,
}: FormRadioGroupProps) {
  const { fieldMeta, disabled: fieldDisabled, errors } = useFieldContext();

  const control = useInputControl(fieldMeta as any);
  const isDisabled = disabled ?? fieldDisabled;
  const hasErrors = errors && errors.length > 0;

  // Ensure value is always a string for RadioGroup
  const radioValue = Array.isArray(control.value) ? control.value[0] : control.value;

  return (
    <RadioGroup
      name={fieldMeta.name}
      value={radioValue ?? ''}
      onValueChange={control.change}
      disabled={isDisabled}
      aria-invalid={hasErrors || undefined}
      aria-describedby={hasErrors ? `${fieldMeta.id}-error` : undefined}
      className={cn(
        orientation === 'horizontal' ? 'flex flex-row space-x-4' : 'flex flex-col space-y-2',
        className
      )}
    >
      {children}
    </RadioGroup>
  );
}

FormRadioGroup.displayName = 'Form.RadioGroup';

/**
 * Form.RadioItem - Individual radio button option
 *
 * @example
 * ```tsx
 * <Form.RadioItem value="option1" label="Option 1" />
 * ```
 */
export function FormRadioItem({
  value,
  label,
  description,
  disabled,
}: FormRadioItemProps) {
  const radioId = `radio-${value}`;

  return (
    <div className="flex items-start space-x-2">
      <RadioGroupItem
        id={radioId}
        value={value}
        disabled={disabled}
        className="mt-1"
      />
      <div className="flex flex-col">
        <Label
          htmlFor={radioId}
          className={cn(
            'text-sm font-normal cursor-pointer',
            disabled && 'cursor-not-allowed opacity-70'
          )}
        >
          {label}
        </Label>
        {description && (
          <span className="text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}

FormRadioItem.displayName = 'Form.RadioItem';
