'use client';

import * as React from 'react';
import { useWatch } from '../hooks/use-watch';
import type { FormWhenProps } from '../types';

/**
 * Form.When - Conditional rendering based on field values
 *
 * Renders children only when the specified field matches the condition.
 *
 * @example
 * ```tsx
 * // Render when field equals value
 * <Form.When field="contactMethod" is="email">
 *   <Form.Field name="email"><Form.Input type="email" /></Form.Field>
 * </Form.When>
 *
 * // Render when field does not equal value
 * <Form.When field="contactMethod" isNot="none">
 *   <Form.Field name="contact"><Form.Input /></Form.Field>
 * </Form.When>
 *
 * // Render when field value is in array
 * <Form.When field="role" in={['admin', 'moderator']}>
 *   <Form.Field name="permissions"><Form.Input /></Form.Field>
 * </Form.When>
 *
 * // Render when field value is not in array
 * <Form.When field="status" notIn={['archived', 'deleted']}>
 *   <Form.Field name="actions"><Form.Input /></Form.Field>
 * </Form.When>
 * ```
 */
export function FormWhen({
  field,
  is,
  isNot,
  in: inArray,
  notIn,
  children,
}: FormWhenProps) {
  const value = useWatch(field);

  // Determine if we should render
  let shouldRender = true;

  // Check "is" condition
  if (is !== undefined) {
    shouldRender = value === is;
  }

  // Check "isNot" condition
  if (isNot !== undefined && shouldRender) {
    shouldRender = value !== isNot;
  }

  // Check "in" condition
  if (inArray !== undefined && shouldRender) {
    shouldRender = inArray.includes(value);
  }

  // Check "notIn" condition
  if (notIn !== undefined && shouldRender) {
    shouldRender = !notIn.includes(value);
  }

  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
}

FormWhen.displayName = 'Form.When';
