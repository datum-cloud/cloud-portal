import { FormProvider } from '../../context/form-context';
import type { FormStepperProps, FormStepperRenderProps, StepConfig } from '../../types';
import { FormProvider as ConformFormProvider, useForm, getFormProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { defineStepper } from '@datum-ui/components/stepper';
import { cn } from '@shadcn/lib/utils';
import type * as Stepperize from '@stepperize/react';
import * as React from 'react';
import { Form as RouterForm } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import type { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

interface FormStepperContextValue {
  /** All step configurations */
  steps: StepConfig[];
  /** Current step config */
  current: StepConfig;
  /** Current step index */
  currentIndex: number;
  /** Go to next step */
  next: () => void;
  /** Go to previous step */
  prev: () => void;
  /** Go to specific step by ID */
  goTo: (stepId: string) => void;
  /** Whether current step is first */
  isFirst: boolean;
  /** Whether current step is last */
  isLast: boolean;
  /** Get metadata for a specific step */
  getStepData: (stepId: string) => Record<string, unknown> | undefined;
  /** Get all metadata from all steps */
  getAllStepData: () => Record<string, unknown>;
  /** Stepperize utils */
  utils: {
    getIndex: (id: string) => number;
  };
}

// ============================================================================
// Context
// ============================================================================

const FormStepperContext = React.createContext<FormStepperContextValue | null>(null);

export function useFormStepperContext(): FormStepperContextValue {
  const context = React.useContext(FormStepperContext);
  if (!context) {
    throw new Error('useFormStepperContext must be used within a Form.Stepper component');
  }
  return context;
}

// ============================================================================
// Schema Utilities
// ============================================================================

/**
 * Merge multiple zod object schemas into one
 * All step schemas must be z.object() types
 */
function mergeSchemas(steps: StepConfig[]): z.ZodObject<any> {
  if (steps.length === 0) {
    throw new Error('Form.Stepper requires at least one step');
  }

  return steps.reduce((acc, step, index) => {
    const schema = step.schema;

    // Verify schema is a ZodObject
    if (!schema || typeof (schema as any).shape !== 'object') {
      console.warn(
        `Form.Stepper: Step "${step.id}" schema should be a z.object(). ` +
          'Auto-merge may not work correctly.'
      );
    }

    if (index === 0) {
      return schema as z.ZodObject<any>;
    }

    // Merge schemas
    return acc.merge(schema as z.ZodObject<any>);
  }, {} as z.ZodObject<any>);
}

/**
 * Convert StepConfig[] to Stepperize step format
 */
function toStepperizeSteps(steps: StepConfig[]): Stepperize.Step[] {
  return steps.map((step) => ({
    id: step.id,
    label: step.label,
    description: step.description,
  })) as Stepperize.Step[];
}

// ============================================================================
// FormStepper Component
// ============================================================================

/**
 * Form.Stepper - Multi-step form container
 *
 * Uses Stepperize internally for step navigation and a single Conform form
 * instance for all steps. Schemas are auto-merged for unified validation.
 *
 * @example
 * ```tsx
 * const steps = [
 *   { id: 'account', label: 'Account', schema: accountSchema },
 *   { id: 'profile', label: 'Profile', schema: profileSchema },
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
  defaultValues,
  id,
}: FormStepperProps & { defaultValues?: Record<string, unknown>; id?: string }) {
  // Create stepperize definition - memoized to prevent recreation
  const stepperDef = React.useMemo(() => {
    const stepperizeSteps = toStepperizeSteps(steps);
    return defineStepper(...stepperizeSteps);
  }, [steps]);

  // Determine initial step index
  const initialStepIndex = React.useMemo(() => {
    if (!initialStep) return undefined;
    const index = steps.findIndex((s) => s.id === initialStep);
    return index >= 0 ? steps[index].id : undefined;
  }, [initialStep, steps]);

  const { Stepper } = stepperDef;

  // Note: initialStep is handled by Stepperize's Scoped component internally
  const providerProps = initialStepIndex ? { initialStep: initialStepIndex as any } : {};

  return (
    <Stepper.Provider {...providerProps}>
      <FormStepperContent
        steps={steps}
        stepperDef={stepperDef}
        onComplete={onComplete}
        onStepChange={onStepChange}
        className={className}
        defaultValues={defaultValues}
        id={id}>
        {children}
      </FormStepperContent>
    </Stepper.Provider>
  );
}

FormStepper.displayName = 'Form.Stepper';

// ============================================================================
// FormStepperContent - Internal component with access to Stepperize context
// ============================================================================

interface FormStepperContentProps {
  steps: StepConfig[];
  stepperDef: ReturnType<typeof defineStepper>;
  children: React.ReactNode | ((props: FormStepperRenderProps) => React.ReactNode);
  onComplete: FormStepperProps['onComplete'];
  onStepChange?: FormStepperProps['onStepChange'];
  className?: string;
  defaultValues?: Record<string, unknown>;
  id?: string;
}

function FormStepperContent({
  steps,
  stepperDef,
  children,
  onComplete,
  onStepChange,
  className,
  defaultValues,
  id,
}: FormStepperContentProps) {
  const { useStepper } = stepperDef;
  const stepper = useStepper();

  // Find current step config
  const currentStepConfig = React.useMemo(
    () => steps.find((s) => s.id === stepper.state.current.data.id) ?? steps[0],
    [steps, stepper.state.current.data.id]
  );

  // Merge all schemas into one combined schema
  const combinedSchema = React.useMemo(() => mergeSchemas(steps), [steps]);

  // Collect all stored metadata as default values
  const storedValues = React.useMemo(() => {
    const allMetadata = steps.reduce(
      (acc, step) => ({
        ...acc,
        ...(stepper.metadata.get(step.id as any) || {}),
      }),
      {}
    );
    return { ...defaultValues, ...allMetadata };
  }, [steps, stepper, defaultValues, stepper.state.current.data.id]); // Include current.id to recompute on step change

  return (
    <StepForm
      key={stepper.state.current.data.id} // Force remount on step change
      steps={steps}
      stepper={stepper}
      currentStepConfig={currentStepConfig}
      combinedSchema={combinedSchema}
      storedValues={storedValues}
      onComplete={onComplete}
      onStepChange={onStepChange}
      className={className}
      id={id}>
      {children}
    </StepForm>
  );
}

// ============================================================================
// StepForm - Keyed component that recreates form on step change
// ============================================================================

interface StepFormProps {
  steps: StepConfig[];
  stepper: any;
  currentStepConfig: StepConfig;
  combinedSchema: z.ZodObject<any>;
  storedValues: Record<string, unknown>;
  children: React.ReactNode | ((props: FormStepperRenderProps) => React.ReactNode);
  onComplete: FormStepperProps['onComplete'];
  onStepChange?: FormStepperProps['onStepChange'];
  className?: string;
  id?: string;
}

function StepForm({
  steps,
  stepper,
  currentStepConfig,
  combinedSchema,
  storedValues,
  children,
  onComplete,
  onStepChange,
  className,
  id,
}: StepFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Single form instance - recreated when this component remounts (step changes)
  const [form, fields] = useForm({
    id: id ?? 'stepper-form',
    constraint: getZodConstraint(combinedSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    defaultValue: storedValues as Record<string, string | null | undefined>,
    onValidate({ formData }) {
      // Validate against current step's schema only (for per-step validation)
      const result = parseWithZod(formData, { schema: currentStepConfig.schema });
      return result as any;
    },
    async onSubmit(event, { submission }) {
      event.preventDefault();

      if (submission?.status !== 'success') {
        return;
      }

      // Store current step's validated data in metadata
      if (submission.value) {
        stepper.metadata.set(
          stepper.state.current.data.id as any,
          submission.value as Record<string, unknown>
        );
      }

      if (stepper.state.isLast) {
        // Final step - collect all metadata and complete
        setIsSubmitting(true);
        try {
          const allData = steps.reduce(
            (acc, step) => ({
              ...acc,
              ...(stepper.metadata.get(step.id as any) || {}),
            }),
            {}
          );
          // Include current submission value to ensure latest data
          const finalData = { ...allData, ...(submission.value as Record<string, unknown>) };

          await onComplete(finalData);
        } catch (error) {
          console.error('Stepper form completion error:', error);
        } finally {
          setIsSubmitting(false);
        }
      } else {
        // Move to next step
        const nextStepId = stepper.lookup.getNext(stepper.state.current.data.id as any)?.id;
        if (nextStepId) {
          stepper.navigation.goTo(nextStepId as any);
          onStepChange?.(nextStepId, 'next');
        }
      }
    },
  });

  // Navigation helpers
  const next = React.useCallback(() => {
    // Trigger form submission which will validate and advance
    formRef.current?.requestSubmit();
  }, []);

  const prev = React.useCallback(() => {
    // Before going back, save current form data to metadata (without validation)
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      const currentData: Record<string, unknown> = {};
      formData.forEach((value, key) => {
        if (key !== 'csrf' && !key.startsWith('$')) {
          currentData[key] = value;
        }
      });
      if (Object.keys(currentData).length > 0) {
        stepper.metadata.set(stepper.state.current.data.id as any, currentData);
      }
    }

    const prevStepId = stepper.lookup.getPrev(stepper.state.current.data.id as any)?.id;
    if (prevStepId) {
      stepper.navigation.goTo(prevStepId as any);
      onStepChange?.(prevStepId, 'prev');
    }
  }, [stepper, onStepChange]);

  const goTo = React.useCallback(
    (stepId: string) => {
      const currentIndex = stepper.lookup.getIndex(stepper.state.current.data.id as any);
      const targetIndex = stepper.lookup.getIndex(stepId as any);

      // Only allow going back without validation
      if (targetIndex < currentIndex) {
        stepper.navigation.goTo(stepId as any);
        onStepChange?.(stepId, 'prev');
      }
      // Going forward requires validation - use next() instead
    },
    [stepper, onStepChange]
  );

  // Helper to get step data from metadata
  const getStepData = React.useCallback(
    (stepId: string) => stepper.metadata.get(stepId as any) as Record<string, unknown> | undefined,
    [stepper]
  );

  // Helper to get all step data
  const getAllStepData = React.useCallback(() => {
    return steps.reduce(
      (acc, step) => ({
        ...acc,
        ...(stepper.metadata.get(step.id as any) || {}),
      }),
      {}
    );
  }, [steps, stepper]);

  // Build context value
  const stepperContextValue: FormStepperContextValue = React.useMemo(
    () => ({
      steps,
      current: currentStepConfig,
      currentIndex: stepper.lookup.getIndex(stepper.state.current.data.id as any),
      next,
      prev,
      goTo,
      isFirst: stepper.state.isFirst,
      isLast: stepper.state.isLast,
      getStepData,
      getAllStepData,
      utils: {
        getIndex: (id: string) => stepper.lookup.getIndex(id as any),
      },
    }),
    [steps, currentStepConfig, stepper, next, prev, goTo, getStepData, getAllStepData]
  );

  // Form context value
  const formContextValue = React.useMemo(
    () => ({
      form: form as any,
      fields: fields as unknown as Record<string, any>,
      isSubmitting,
      submit: () => formRef.current?.requestSubmit(),
      reset: () => form.reset(),
      formId: form.id,
    }),
    [form, fields, isSubmitting]
  );

  // Build render props for children function
  const renderProps: FormStepperRenderProps = {
    steps,
    current: currentStepConfig,
    currentIndex: stepper.lookup.getIndex(stepper.state.current.data.id as any),
    next,
    prev,
    goTo,
    isFirst: stepper.state.isFirst,
    isLast: stepper.state.isLast,
    getStepData,
    getAllStepData,
  };

  // Resolve children - support both ReactNode and render function
  const resolvedChildren = typeof children === 'function' ? children(renderProps) : children;

  return (
    <FormStepperContext.Provider value={stepperContextValue}>
      <FormProvider value={formContextValue}>
        <ConformFormProvider context={form.context}>
          <RouterForm
            ref={formRef}
            {...getFormProps(form)}
            method="POST"
            className={cn('space-y-6', className)}
            autoComplete="off">
            <AuthenticityTokenInput />
            {resolvedChildren}
          </RouterForm>
        </ConformFormProvider>
      </FormProvider>
    </FormStepperContext.Provider>
  );
}
