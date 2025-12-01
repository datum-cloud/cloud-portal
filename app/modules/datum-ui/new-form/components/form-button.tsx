'use client';

import { useFormContext } from '../context/form-context';
import type { FormButtonProps } from '../types';
import { Button } from '@datum-ui/components';
import * as React from 'react';

/**
 * Form.Button - A button for non-submit actions within a form
 *
 * Automatically gets disabled when the form is submitting.
 * Use this for cancel buttons, reset buttons, or other actions.
 *
 * @example
 * ```tsx
 * <Form.Button onClick={() => navigate(-1)}>
 *   Cancel
 * </Form.Button>
 *
 * <Form.Button onClick={() => form.reset()} type="secondary">
 *   Reset
 * </Form.Button>
 * ```
 */
export function FormButton({
  children,
  onClick,
  type = 'quaternary',
  theme = 'borderless',
  size,
  disabled,
  className,
  disableOnSubmit = true,
}: FormButtonProps) {
  const { isSubmitting } = useFormContext();

  const isDisabled = disabled || (disableOnSubmit && isSubmitting);

  return (
    <Button
      htmlType="button"
      type={type}
      theme={theme}
      size={size}
      disabled={isDisabled}
      className={className}
      onClick={onClick}>
      {children}
    </Button>
  );
}

FormButton.displayName = 'Form.Button';
