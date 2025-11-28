'use client';

import * as React from 'react';
import { useFormContext } from '../context/form-context';
import type { FormCustomProps, FormCustomRenderProps } from '../types';

/**
 * Form.Custom - Escape hatch for custom implementations
 *
 * Provides access to the underlying form context for complex use cases
 * that don't fit the standard component patterns.
 *
 * @example
 * ```tsx
 * <Form.Custom>
 *   {({ form, fields, submit, reset }) => (
 *     <MyCustomComponent
 *       fields={fields}
 *       onCustomAction={() => {
 *         // Do something custom
 *         submit();
 *       }}
 *     />
 *   )}
 * </Form.Custom>
 * ```
 */
export function FormCustom({ children }: FormCustomProps) {
  const { form, fields, isSubmitting, submit, reset } = useFormContext();

  const renderProps: FormCustomRenderProps = {
    form: form as any,
    fields: fields as any,
    isSubmitting,
    submit,
    reset,
  };

  return <>{children(renderProps)}</>;
}

FormCustom.displayName = 'Form.Custom';
