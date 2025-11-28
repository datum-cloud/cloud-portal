'use client';

import * as React from 'react';
import { FormProvider as ConformFormProvider, useForm, getFormProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Form as RouterForm } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { cn } from '@shadcn/lib/utils';
import { FormProvider } from '../context/form-context';
import type { z } from 'zod';
import type { FormRootProps, FormContextValue } from '../types';

/**
 * Form.Root - The root form component
 *
 * Provides form context to all children with built-in:
 * - Zod schema validation
 * - CSRF protection
 * - Conform integration
 * - React Router form support
 *
 * @example
 * ```tsx
 * <Form.Root
 *   schema={userSchema}
 *   onSubmit={async (data) => {
 *     await saveUser(data);
 *   }}
 *   defaultValues={{ role: 'user' }}
 * >
 *   <Form.Field name="email" label="Email" required>
 *     <Form.Input type="email" />
 *   </Form.Field>
 *   <Form.Submit>Save</Form.Submit>
 * </Form.Root>
 * ```
 */
export function FormRoot<T extends z.ZodType>({
  schema,
  children,
  onSubmit,
  action,
  method = 'POST',
  id,
  defaultValues,
  mode = 'onBlur',
  isSubmitting: externalIsSubmitting,
  onError,
  onSuccess,
  className,
}: FormRootProps<T>) {
  const [internalIsSubmitting, setInternalIsSubmitting] = React.useState(false);
  // Use external isSubmitting if provided, otherwise use internal state
  const isSubmitting = externalIsSubmitting ?? internalIsSubmitting;
  const formRef = React.useRef<HTMLFormElement>(null);

  // Map mode to Conform's expected values
  const shouldValidate = mode === 'onChange' ? 'onInput' : mode;

  const [form, fields] = useForm({
    id,
    constraint: getZodConstraint(schema),
    shouldValidate,
    shouldRevalidate: mode === 'onSubmit' ? 'onSubmit' : 'onInput',
    defaultValue: defaultValues as any,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema }) as any;
    },
    async onSubmit(event, { submission }) {
      // If no onSubmit handler is provided, let React Router handle the submission
      // This allows the form to submit to the current route's action or a specified action
      if (!onSubmit) {
        // Set submitting state for UI feedback
        setInternalIsSubmitting(true);
        return;
      }

      // Client-side submission - prevent default to handle it ourselves
      event.preventDefault();

      if (submission?.status === 'success') {
        setInternalIsSubmitting(true);
        try {
          await onSubmit(submission.value as z.infer<T>);
          onSuccess?.(submission.value as z.infer<T>);
        } catch (error) {
          console.error('Form submission error:', error);
        } finally {
          setInternalIsSubmitting(false);
        }
      } else if (submission?.status === 'error' && onError) {
        // Handle validation errors
        const { ZodError } = await import('zod');
        const zodError = new ZodError(
          Object.entries(submission.error ?? {}).flatMap(([path, messages]) =>
            (messages ?? []).map((message) => ({
              code: 'custom' as const,
              path: path.split('.'),
              message,
            }))
          )
        );
        onError(zodError as z.ZodError<z.infer<T>>);
      }
    },
  });

  const submit = React.useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  const reset = React.useCallback(() => {
    form.reset();
  }, [form]);

  const contextValue = React.useMemo(
    () => ({
      form: form as any,
      fields: fields as unknown as Record<string, any>,
      isSubmitting,
      submit,
      reset,
      formId: form.id,
    }),
    [form, fields, isSubmitting, submit, reset]
  );

  return (
    <FormProvider value={contextValue}>
      <ConformFormProvider context={form.context}>
        <RouterForm
          ref={formRef}
          {...getFormProps(form)}
          method={method}
          action={action}
          className={cn('space-y-6', className)}
          autoComplete="off"
        >
          <AuthenticityTokenInput />
          {children}
        </RouterForm>
      </ConformFormProvider>
    </FormProvider>
  );
}

FormRoot.displayName = 'Form.Root';
