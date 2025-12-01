'use client';

import { useStepperContext } from '../../context/stepper-context';
import type { FormStepProps } from '../../types';
import * as React from 'react';

/**
 * Form.Step - Individual step content container
 *
 * Only renders its children when the step is active.
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
  const { current } = useStepperContext();

  // Only render if this step is active
  if (current.id !== id) {
    return null;
  }

  return <>{children}</>;
}

FormStep.displayName = 'Form.Step';
