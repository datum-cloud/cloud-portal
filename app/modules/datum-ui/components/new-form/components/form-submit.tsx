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
export function FormSubmit({ children, loadingText, ...props }: FormSubmitProps) {
  const { isSubmitting } = useFormContext();

  return (
    <Button
      htmlType="submit"
      disabled={props.disabled || isSubmitting}
      loading={isSubmitting}
      {...props}>
      {isSubmitting && loadingText ? loadingText : children}
    </Button>
  );
}

FormSubmit.displayName = 'Form.Submit';
