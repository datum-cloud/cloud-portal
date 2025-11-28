'use client';

import * as React from 'react';
import { FormProvider as ConformFormProvider, useForm, getFormProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Form as RouterForm } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { cn } from '@shadcn/lib/utils';
import { FormProvider } from '../../context/form-context';
import { StepperProvider, useStepperContext } from '../../context/stepper-context';
import type { FormStepperProps } from '../../types';

/**
 * Form.Stepper - Multi-step form container
 *
 * @example
 * ```tsx
 * const steps = [
 *   { id: 'account', label: 'Account', schema: accountSchema },
 *   { id: 'profile', label: 'Profile', schema: profileSchema },
 *   { id: 'confirm', label: 'Confirm', schema: confirmSchema },
 * ];
 *
 * <Form.Stepper steps={steps} onComplete={handleComplete}>
 *   <Form.StepperNavigation />
 *
 *   <Form.Step id="account">
 *     <Form.Field name="email" label="Email" required>
 *       <Form.Input type="email" />
 *     </Form.Field>
 *   </Form.Step>
 *
 *   <Form.Step id="profile">
 *     <Form.Field name="name" label="Full Name" required>
 *       <Form.Input />
 *     </Form.Field>
 *   </Form.Step>
 *
 *   <Form.Step id="confirm">
 *     <p>Review your information</p>
 *   </Form.Step>
 *
 *   <Form.StepperControls />
 * </Form.Stepper>
 * ```
 */
export function FormStepper({
  steps,
  children,
  onComplete,
  onStepChange,
  initialStep,
  className,
}: FormStepperProps) {
  return (
    <StepperProvider
      steps={steps}
      initialStep={initialStep}
      onStepChange={onStepChange}
    >
      <StepperFormContent
        steps={steps}
        onComplete={onComplete}
        className={className}
      >
        {children}
      </StepperFormContent>
    </StepperProvider>
  );
}

FormStepper.displayName = 'Form.Stepper';

// Internal component that has access to stepper context
interface StepperFormContentProps {
  steps: FormStepperProps['steps'];
  children: React.ReactNode;
  onComplete: FormStepperProps['onComplete'];
  className?: string;
}

function StepperFormContent({
  steps,
  children,
  onComplete,
  className,
}: StepperFormContentProps) {
  const stepper = useStepperContext();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Get current step's schema
  const currentSchema = stepper.current.schema;

  const [form, fields] = useForm<Record<string, unknown>>({
    id: `stepper-form-${stepper.current.id}`,
    constraint: getZodConstraint(currentSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    defaultValue: stepper.getMetadata(stepper.current.id) as Record<string, string | null | undefined>,
    onValidate({ formData }) {
      const result = parseWithZod(formData, { schema: currentSchema });

      // Store validated data in metadata
      if (result.status === 'success' && result.value) {
        stepper.setMetadata(stepper.current.id, result.value as Record<string, unknown>);
      }

      return result as any;
    },
    async onSubmit(event, { submission }) {
      event.preventDefault();

      if (submission?.status !== 'success') {
        return;
      }

      // Store current step's data
      stepper.setMetadata(stepper.current.id, submission.value as Record<string, unknown>);

      if (stepper.isLast) {
        // Collect all metadata and complete
        setIsSubmitting(true);
        try {
          const allData = steps.reduce(
            (acc, step) => ({
              ...acc,
              ...stepper.getMetadata(step.id),
            }),
            {}
          );

          // Add current submission value to ensure latest data
          const finalData = { ...allData, ...(submission.value as Record<string, unknown>) };

          await onComplete(finalData);
        } catch (error) {
          console.error('Stepper form completion error:', error);
        } finally {
          setIsSubmitting(false);
        }
      } else {
        // Move to next step
        stepper.next();
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
          method="POST"
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
