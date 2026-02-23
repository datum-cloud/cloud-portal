import type { FormStepProps } from '../../types';
import { useFormStepperContext } from './form-stepper';
import * as React from 'react';

/**
 * Form.Step - Individual step content container
 *
 * Only renders its children when the step is active.
 * Works with the single-form architecture - fields remain registered
 * even when unmounted, preserving their values.
 *
 * @example
 * ```tsx
 * <Form.Step id="account">
 *   <Form.Field name="email" label="Email" required>
 *     <Form.Input type="email" />
 *   </Form.Field>
 * </Form.Step>
 * ```
 */
export function FormStep({ id, children }: FormStepProps) {
  const { current } = useFormStepperContext();

  // Only render if this step is active
  if (current.id !== id) {
    return null;
  }

  return <>{children}</>;
}

FormStep.displayName = 'Form.Step';
