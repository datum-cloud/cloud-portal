import { useFormContext } from '../context/form-context';
import type { FormSubmitProps } from '../types';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';

/**
 * Form.Submit - Submit button with automatic loading state
 *
 * @example
 * ```tsx
 * <Form.Submit loadingText="Saving...">
 *   Save Changes
 * </Form.Submit>
 * ```
 */
export function FormSubmit({
  children,
  loadingText,
  type = 'primary',
  theme = 'solid',
  size = 'default',
  disabled = false,
  className,
}: FormSubmitProps) {
  const { isSubmitting } = useFormContext();
  const isDisabled = disabled || isSubmitting;

  return (
    <Button
      htmlType="submit"
      type={type}
      theme={theme}
      size={size}
      disabled={isDisabled}
      loading={isSubmitting}
      className={cn(className)}>
      {isSubmitting && loadingText ? loadingText : children}
    </Button>
  );
}

FormSubmit.displayName = 'Form.Submit';
