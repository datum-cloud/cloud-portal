import { FormProvider } from '../context/form-context';
import type { FormRootProps, FormRootRenderProps } from '../types';
import {
  trackFormError,
  trackFormSubmit,
  trackFormSuccess,
  trackFormValidationError,
  captureError,
} from '@/modules/sentry';
import { FormProvider as ConformFormProvider, useForm, getFormProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';
import { Form as RouterForm } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import type { z } from 'zod';

/**
 * Form.Root - The root form component
 *
 * Provides form context to all children with built-in:
 * - Zod schema validation
 * - CSRF protection
 * - Conform integration
 * - React Router form support
 *
 * Supports two patterns:
 * 1. ReactNode children - for standard forms
 * 2. Render function - for forms needing access to form state
 *
 * @example Standard usage
 * ```tsx
 * <Form.Root schema={userSchema} onSubmit={handleSubmit}>
 *   <Form.Field name="email" label="Email" required>
 *     <Form.Input type="email" />
 *   </Form.Field>
 *   <Form.Submit>Save</Form.Submit>
 * </Form.Root>
 * ```
 *
 * @example Render function for form state access
 * ```tsx
 * <Form.Root schema={userSchema} onSubmit={handleSubmit}>
 *   {({ form, fields, isSubmitting }) => (
 *     <>
 *       <Form.Field name="email" label="Email" required>
 *         <Form.Input type="email" />
 *       </Form.Field>
 *       <Button
 *         disabled={isSubmitting}
 *         onClick={() => form.update({ value: { email: '' } })}
 *       >
 *         Cancel
 *       </Button>
 *       <Form.Submit>Save</Form.Submit>
 *     </>
 *   )}
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
  name,
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
      const formName = name || id || 'unnamed-form';

      // Track form submission attempt
      trackFormSubmit({ formName, formId: id });

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
          trackFormSuccess({ formName, formId: id });
        } catch (error) {
          trackFormError({ formName, formId: id, error: error as Error });
          captureError(error as Error, {
            message: `Form submission error: ${formName}`,
            tags: { 'form.name': formName, 'form.id': id || 'unknown' },
          });
          console.error('Form submission error:', error);
        } finally {
          setInternalIsSubmitting(false);
        }
      } else if (submission?.status === 'error') {
        // Track validation errors
        trackFormValidationError({
          formName,
          formId: id,
          fieldErrors: (submission.error as Record<string, string[]>) ?? {},
        });

        if (onError) {
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

  // Determine if children is a render function
  const isRenderFunction = typeof children === 'function';

  // Create render props for render function pattern
  const renderProps: FormRootRenderProps = React.useMemo(
    () => ({
      form: form as any,
      fields: fields as unknown as Record<string, any>,
      isSubmitting,
      submit,
      reset,
    }),
    [form, fields, isSubmitting, submit, reset]
  );

  // Render children - either as ReactNode or render function
  const renderChildren = () => {
    if (isRenderFunction) {
      return (children as (props: FormRootRenderProps) => React.ReactNode)(renderProps);
    }
    return children;
  };

  return (
    <FormProvider value={contextValue}>
      <ConformFormProvider context={form.context}>
        <RouterForm
          ref={formRef}
          {...getFormProps(form)}
          method={method}
          action={action}
          className={cn('space-y-6', className)}
          autoComplete="off">
          <AuthenticityTokenInput />
          {renderChildren()}
        </RouterForm>
      </ConformFormProvider>
    </FormProvider>
  );
}

FormRoot.displayName = 'Form.Root';
