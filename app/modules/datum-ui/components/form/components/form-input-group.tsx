import { useFieldContext } from '../context/field-context';
import { getInputProps } from '@conform-to/react';
import { InputWithAddons, InputWithAddonsProps } from '@datum-ui/components/input-with-addons';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';

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
export const FormInputGroup = React.forwardRef<HTMLInputElement, InputWithAddonsProps>(
  ({ type = 'text', className, disabled, ...props }, ref) => {
    const { fieldMeta, disabled: fieldDisabled, errors } = useFieldContext();

    // getInputProps expects a narrower type than HTMLInputTypeAttribute
    // Type assertion is safe here since invalid types will be handled by the input element
    const inputProps = getInputProps(fieldMeta, {
      type: type as
        | 'text'
        | 'email'
        | 'password'
        | 'number'
        | 'tel'
        | 'url'
        | 'search'
        | 'date'
        | 'time'
        | 'datetime-local',
    });
    const isDisabled = disabled ?? fieldDisabled;
    const hasErrors = errors && errors.length > 0;

    return (
      <InputWithAddons
        ref={ref}
        {...inputProps}
        {...props}
        type={type}
        disabled={isDisabled}
        aria-invalid={hasErrors || undefined}
        aria-describedby={hasErrors ? `${fieldMeta.id}-error` : undefined}
        className={cn('text-xs!', className)}
      />
    );
  }
);

FormInputGroup.displayName = 'Form.InputGroup';
