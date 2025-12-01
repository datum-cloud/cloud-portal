'use client';

import { useFieldContext } from '../context/field-context';
import { Label } from '../primitives/label';
import { Switch } from '../primitives/switch';
import type { FormSwitchProps } from '../types';
import { useInputControl } from '@conform-to/react';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';

/**
 * Form.Switch - Toggle switch component
 *
 * Automatically wired to the parent Form.Field context.
 *
 * @example
 * ```tsx
 * <Form.Field name="notifications">
 *   <Form.Switch label="Enable email notifications" />
 * </Form.Field>
 * ```
 */
export function FormSwitch({ label, disabled, className }: FormSwitchProps) {
  const { fieldMeta, disabled: fieldDisabled, errors } = useFieldContext();

  const control = useInputControl(fieldMeta as any);
  const isDisabled = disabled ?? fieldDisabled;
  const hasErrors = errors && errors.length > 0;

  // Convert string value to boolean
  const isChecked = control.value === 'on' || control.value === 'true';

  const handleCheckedChange = (checked: boolean) => {
    control.change(checked ? 'on' : '');
  };

  const switchId = fieldMeta.id;

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Switch
        id={switchId}
        name={fieldMeta.name}
        checked={isChecked}
        onCheckedChange={handleCheckedChange}
        disabled={isDisabled}
        aria-invalid={hasErrors || undefined}
        aria-describedby={hasErrors ? `${fieldMeta.id}-error` : undefined}
      />
      {label && (
        <Label
          htmlFor={switchId}
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

FormSwitch.displayName = 'Form.Switch';
