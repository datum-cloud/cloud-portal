'use client';

import { FieldProvider } from '../context/field-context';
import { useFormContext } from '../context/form-context';
import { Label } from '../primitives/label';
import type { FormFieldProps, FormFieldContextValue, FormFieldRenderProps } from '../types';
import { useInputControl } from '@conform-to/react';
import { Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { CircleHelp } from 'lucide-react';
import * as React from 'react';

/**
 * Internal FieldLabel component with hover-reveal tooltip
 */
const FieldLabel = ({
  htmlFor,
  label,
  hasErrors,
  required,
  tooltip,
  className,
}: {
  htmlFor: string;
  label: React.ReactNode;
  hasErrors?: boolean;
  required?: boolean;
  tooltip?: string | React.ReactNode;
  className?: string;
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = React.useState(false);
  const [isHovering, setIsHovering] = React.useState(false);

  return (
    <div
      className="relative flex w-fit items-center space-x-2"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}>
      <Label
        htmlFor={htmlFor}
        className={cn('gap-0 text-sm font-medium', hasErrors && 'text-destructive', className)}>
        {label}
        {required && (
          <span className="text-destructive align-super text-sm leading-0" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {tooltip && (
        <Tooltip
          message={tooltip}
          open={isTooltipVisible}
          onOpenChange={setIsTooltipVisible}
          side="bottom">
          <CircleHelp
            className={cn(
              'text-ring absolute top-0.5 -right-3 size-3.5 cursor-pointer transition-opacity duration-400',
              isHovering || isTooltipVisible ? 'opacity-100' : 'opacity-0'
            )}
          />
        </Tooltip>
      )}
    </div>
  );
};

/**
 * Form.Field - Field wrapper component
 *
 * Provides field context to children with:
 * - Automatic label rendering
 * - Error display
 * - Description text
 * - Required indicator
 * - Accessibility attributes
 *
 * Supports two patterns:
 * 1. ReactNode children - for standard Form inputs
 * 2. Render function - for custom components needing field access
 *
 * @example Standard usage
 * ```tsx
 * <Form.Field name="email" label="Email Address" required>
 *   <Form.Input type="email" />
 * </Form.Field>
 * ```
 *
 * @example Render function for custom components
 * ```tsx
 * <Form.Field name="role" label="Role" required>
 *   {({ control, meta, fields }) => (
 *     <CustomSelect
 *       name={meta.name}
 *       value={control.value}
 *       onChange={control.change}
 *     />
 *   )}
 * </Form.Field>
 * ```
 */
export function FormField({
  name,
  children,
  label,
  description,
  tooltip,
  required = false,
  disabled = false,
  className,
  labelClassName,
}: FormFieldProps) {
  const { fields, form, isSubmitting } = useFormContext();

  // Get field metadata - support nested paths
  const fieldMeta = React.useMemo(() => {
    const parts = name.split('.');
    let current: any = fields;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current) break;

      // Handle array access like "items.0.name"
      if (/^\d+$/.test(part)) {
        const fieldList = current.getFieldList?.();
        if (fieldList) {
          const item = fieldList[parseInt(part, 10)];
          // If there are more parts, get the fieldset
          if (i < parts.length - 1 && item?.getFieldset) {
            current = item.getFieldset();
          } else {
            current = item;
          }
        } else {
          current = current[part];
        }
      } else {
        // First check if it's a direct property (top-level field)
        if (current[part] !== undefined) {
          current = current[part];
        } else if (typeof current.getFieldset === 'function') {
          // Try getFieldset for nested objects
          current = current.getFieldset()[part];
        } else {
          current = undefined;
        }
      }
    }

    return current;
  }, [fields, name]);

  // Derive values from fieldMeta (may be undefined)
  const errors = fieldMeta?.errors;
  const hasErrors = errors && errors.length > 0;
  const fieldId = fieldMeta?.id ?? '';
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = hasErrors ? `${fieldId}-error` : undefined;

  // Context value - defined before early return to follow hooks rules
  const contextValue: FormFieldContextValue = React.useMemo(
    () => ({
      name: fieldMeta?.name ?? '',
      id: fieldId,
      errors,
      required,
      disabled,
      fieldMeta,
    }),
    [fieldMeta, fieldId, errors, required, disabled]
  );

  // Early return after all hooks
  if (!fieldMeta) {
    console.warn(`Form.Field: Field "${name}" not found in form schema`);
    return null;
  }

  // Determine if children is a render function
  const isRenderFunction = typeof children === 'function';

  // Render the field content
  const renderContent = () => {
    if (isRenderFunction) {
      // Use the render function pattern
      return (
        <FormFieldRenderContent
          fieldMeta={fieldMeta}
          fields={fields}
          form={form}
          isSubmitting={isSubmitting}
          required={required}
          disabled={disabled}>
          {children}
        </FormFieldRenderContent>
      );
    }
    // Standard ReactNode children
    return children;
  };

  return (
    <FieldProvider value={contextValue}>
      <div className={cn('flex flex-col space-y-2', className)}>
        {/* Label */}
        {label && (
          <FieldLabel
            htmlFor={fieldId}
            label={label}
            hasErrors={hasErrors}
            required={required}
            tooltip={tooltip}
            className={labelClassName}
          />
        )}

        {/* Field Input */}
        {renderContent()}

        {/* Description */}
        {description && (
          <p id={descriptionId} className="text-muted-foreground text-xs text-wrap">
            {description}
          </p>
        )}

        {/* Errors */}
        {hasErrors && (
          <ul
            id={errorId}
            className={cn(
              'text-destructive space-y-1 text-sm font-medium',
              errors.length > 1 && 'list-disc pl-4'
            )}
            role="alert"
            aria-live="polite">
            {errors.map((error: string) => (
              <li key={error} className="text-wrap">
                {error}
              </li>
            ))}
          </ul>
        )}
      </div>
    </FieldProvider>
  );
}

/**
 * Internal component to handle render function pattern
 * This is needed because hooks (useInputControl) must be called unconditionally
 */
function FormFieldRenderContent({
  fieldMeta,
  fields,
  form,
  isSubmitting,
  required,
  disabled,
  children,
}: {
  fieldMeta: any;
  fields: Record<string, any>;
  form: any;
  isSubmitting: boolean;
  required: boolean;
  disabled: boolean;
  children: (props: FormFieldRenderProps) => React.ReactNode;
}) {
  const control = useInputControl(fieldMeta);

  const meta = React.useMemo(
    () => ({
      name: fieldMeta.name,
      id: fieldMeta.id,
      errors: fieldMeta.errors,
      required,
      disabled,
    }),
    [fieldMeta.name, fieldMeta.id, fieldMeta.errors, required, disabled]
  );

  const renderProps: FormFieldRenderProps = {
    field: fieldMeta,
    control: {
      value: control.value,
      change: control.change,
      blur: control.blur,
      focus: control.focus,
    },
    meta,
    fields,
    form,
    isSubmitting,
  };

  return <>{children(renderProps)}</>;
}

FormField.displayName = 'Form.Field';
