import type { FormMetadata, FieldMetadata } from '@conform-to/react';
import { ButtonProps } from '@datum-ui/components';
import type { z } from 'zod';

// ============================================================================
// Form Types
// ============================================================================

/**
 * Render props passed to Form.Root when using render function pattern
 */
export interface FormRootRenderProps {
  /** Conform form metadata (for form.update, form.reset, etc.) */
  form: FormMetadata<Record<string, unknown>>;
  /** All form fields with their metadata and values */
  fields: Record<string, FieldMetadata<unknown>>;
  /** Whether the form is currently submitting */
  isSubmitting: boolean;
  /** Programmatically submit the form */
  submit: () => void;
  /** Reset form to default values */
  reset: () => void;
}

export interface FormRootProps<T extends z.ZodType> {
  /** Zod schema for validation */
  schema: T;
  /**
   * Form children - can be either:
   * - ReactNode: Standard form content
   * - Render function: For accessing form state (form, fields, isSubmitting, etc.)
   *
   * @example Standard usage
   * ```tsx
   * <Form.Root schema={schema}>
   *   <Form.Field name="email"><Form.Input /></Form.Field>
   *   <Form.Submit>Save</Form.Submit>
   * </Form.Root>
   * ```
   *
   * @example Render function for form state access
   * ```tsx
   * <Form.Root schema={schema}>
   *   {({ form, fields, isSubmitting }) => (
   *     <>
   *       <Form.Field name="email"><Form.Input /></Form.Field>
   *       <Button disabled={isSubmitting} onClick={() => form.update({...})}>
   *         Cancel
   *       </Button>
   *     </>
   *   )}
   * </Form.Root>
   * ```
   */
  children: React.ReactNode | ((props: FormRootRenderProps) => React.ReactNode);

  // Submission
  /** Client-side submit handler */
  onSubmit?: (data: z.infer<T>) => void | Promise<void>;
  /** React Router action path for server-side submission */
  action?: string;
  /** HTTP method for form submission */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  // Configuration
  /** Unique form ID */
  id?: string;
  /** Default values for form fields */
  defaultValues?: Partial<z.infer<T>>;
  /** When to validate: onBlur, onChange, or onSubmit */
  mode?: 'onBlur' | 'onChange' | 'onSubmit';
  /**
   * External submitting state - use when submission is handled externally (e.g., with useFetcher)
   * When provided, this overrides the internal isSubmitting state
   */
  isSubmitting?: boolean;

  // Callbacks
  /** Called when validation fails */
  onError?: (errors: z.ZodError<z.infer<T>>) => void;
  /** Called after successful submission */
  onSuccess?: (data: z.infer<T>) => void;

  // Styling
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Field Types
// ============================================================================

/**
 * Render props passed to Form.Field when using render function pattern
 */
export interface FormFieldRenderProps {
  /** Current field's Conform metadata */
  field: FieldMetadata<unknown>;
  /** Input control for programmatic value updates */
  control: {
    value: string | string[] | undefined;
    change: (value: string | string[]) => void;
    blur: () => void;
    focus: () => void;
  };
  /** Field meta information */
  meta: {
    name: string;
    id: string;
    errors: string[] | undefined;
    required: boolean;
    disabled: boolean;
  };
  /** Access to all form fields (for multi-field scenarios) */
  fields: Record<string, FieldMetadata<unknown>>;
  /** Form metadata from Conform */
  form: FormMetadata<Record<string, unknown>>;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
}

export interface FormFieldProps {
  /** Field name - supports nested paths like "address.city" */
  name: string;
  /**
   * Form children - can be either:
   * - ReactNode: Standard input components (Form.Input, Form.Select, etc.)
   * - Render function: For custom components needing field access
   *
   * @example Standard usage
   * ```tsx
   * <Form.Field name="email" label="Email">
   *   <Form.Input type="email" />
   * </Form.Field>
   * ```
   *
   * @example Render function for custom components
   * ```tsx
   * <Form.Field name="role" label="Role">
   *   {({ control, meta, fields }) => (
   *     <CustomSelect
   *       value={control.value}
   *       onChange={control.change}
   *     />
   *   )}
   * </Form.Field>
   * ```
   */
  children: React.ReactNode | ((props: FormFieldRenderProps) => React.ReactNode);

  // Labels & Help Text
  /** Field label */
  label?: string | React.ReactNode;
  /** Helper description below the field */
  description?: string | React.ReactNode;
  /** Tooltip information */
  tooltip?: string | React.ReactNode;

  // State
  /** Mark field as required (shows asterisk) */
  required?: boolean;
  /** Disable the field */
  disabled?: boolean;

  // Styling
  /** Additional CSS classes for the field wrapper */
  className?: string;
  /** Additional CSS classes for the label */
  labelClassName?: string;
}

export interface FormFieldContextValue {
  /** Field name */
  name: string;
  /** Field ID for accessibility */
  id: string;
  /** Field errors */
  errors?: string[];
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Conform field metadata */
  fieldMeta: FieldMetadata<unknown>;
}

// ============================================================================
// Input Component Types
// ============================================================================

export interface FormInputProps extends Omit<React.ComponentProps<'input'>, 'name'> {
  /** Input type */
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'tel'
    | 'url'
    | 'search'
    | 'date'
    | 'time'
    | 'datetime-local';
}

export interface FormTextareaProps extends Omit<React.ComponentProps<'textarea'>, 'name'> {
  /** Number of visible rows */
  rows?: number;
}

export interface FormSelectProps {
  /** Placeholder text when no value selected */
  placeholder?: string;
  /** Disable the select */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Select options as children */
  children: React.ReactNode;
}

export interface FormSelectItemProps {
  /** Option value */
  value: string;
  /** Option label */
  children: React.ReactNode;
  /** Disable this option */
  disabled?: boolean;
}

export interface FormCheckboxProps {
  /** Inline label next to checkbox */
  label?: string;
  /** Disable the checkbox */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface FormSwitchProps {
  /** Inline label next to switch */
  label?: string;
  /** Disable the switch */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface FormRadioGroupProps {
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Disable all radio items */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Radio items as children */
  children: React.ReactNode;
}

export interface FormRadioItemProps {
  /** Radio value */
  value: string;
  /** Radio label */
  label: string;
  /** Optional description */
  description?: string;
  /** Disable this radio item */
  disabled?: boolean;
}

export interface FormCopyBoxProps {
  /** Display variant: 'default' shows Copy button, 'icon-only' shows icon */
  variant?: 'default' | 'icon-only';
  /** Custom className for the wrapper */
  className?: string;
  /** Custom className for the content area */
  contentClassName?: string;
  /** Custom className for the button */
  buttonClassName?: string;
  /** Placeholder text when value is empty */
  placeholder?: string;
}

// ============================================================================
// Submit & Error Types
// ============================================================================

export interface FormSubmitProps extends ButtonProps {
  /** Button content */
  children: React.ReactNode;
  /** Text to show while loading */
  loadingText?: string;
}

export interface FormButtonProps {
  /** Button content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Button variant */
  type?: ButtonProps['type'];
  /** Button theme */
  theme?: ButtonProps['theme'];
  /** Button size */
  size?: ButtonProps['size'];
  /** Disable the button */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to disable the button when form is submitting (default: true) */
  disableOnSubmit?: boolean;
}

export interface FormErrorProps {
  /** Error message or render function */
  children?: React.ReactNode | ((errors: string[]) => React.ReactNode);
  /** Additional CSS classes */
  className?: string;
}

export interface FormDescriptionProps {
  /** Description content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Advanced Component Types
// ============================================================================

export interface FormWhenProps {
  /** Field name to watch */
  field: string;
  /** Render when field equals this value */
  is?: unknown;
  /** Render when field does not equal this value */
  isNot?: unknown;
  /** Render when field value is in array */
  in?: unknown[];
  /** Render when field value is not in array */
  notIn?: unknown[];
  /** Children to render conditionally */
  children: React.ReactNode;
}

export interface FormFieldArrayProps {
  /** Array field name */
  name: string;
  /** Render function with array helpers */
  children: (props: FormFieldArrayRenderProps) => React.ReactNode;
}

export interface FormFieldArrayRenderProps {
  /** Array of field items with id and key */
  fields: Array<{ id: string; key: string; name: string }>;
  /** Add a new item to the array */
  append: (value?: Record<string, unknown>) => void;
  /** Remove an item at index */
  remove: (index: number) => void;
  /** Move an item from one index to another */
  move: (from: number, to: number) => void;
}

export interface FormCustomProps {
  /** Render function with form context */
  children: (context: FormCustomRenderProps) => React.ReactNode;
}

export interface FormCustomRenderProps {
  /** Form metadata from Conform */
  form: FormMetadata<Record<string, unknown>>;
  /** All field metadata */
  fields: Record<string, FieldMetadata<unknown>>;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Submit the form programmatically */
  submit: () => void;
  /** Reset the form */
  reset: () => void;
}

// ============================================================================
// Stepper Types
// ============================================================================

export interface StepConfig {
  /** Unique step identifier */
  id: string;
  /** Step label displayed in navigation */
  label: string;
  /** Optional step description */
  description?: string;
  /** Zod schema for this step's validation */
  schema: z.ZodType;
}

/**
 * Render props context passed to Form.Stepper children function
 */
export interface FormStepperRenderProps {
  /** All step configurations */
  steps: StepConfig[];
  /** Current step config */
  current: StepConfig;
  /** Current step index (0-based) */
  currentIndex: number;
  /** Go to next step (triggers validation) */
  next: () => void;
  /** Go to previous step (no validation) */
  prev: () => void;
  /** Go to specific step by ID (only backwards without validation) */
  goTo: (stepId: string) => void;
  /** Whether current step is first */
  isFirst: boolean;
  /** Whether current step is last */
  isLast: boolean;
  /** Get data from a specific step by ID */
  getStepData: (stepId: string) => Record<string, unknown> | undefined;
  /** Get all data from all completed steps */
  getAllStepData: () => Record<string, unknown>;
}

export interface FormStepperProps {
  /** Step configurations */
  steps: StepConfig[];
  /** Form children - can be ReactNode or render function for accessing stepper context */
  children: React.ReactNode | ((props: FormStepperRenderProps) => React.ReactNode);

  // Callbacks
  /** Called when all steps are completed */
  onComplete: (data: Record<string, unknown>) => void | Promise<void>;
  /** Called when step changes */
  onStepChange?: (stepId: string, direction: 'next' | 'prev') => void;

  // Configuration
  /** Initial step ID */
  initialStep?: string;

  // Styling
  /** Additional CSS classes */
  className?: string;
}

export interface FormStepProps {
  /** Step ID - must match a step in steps array */
  id: string;
  /** Step content */
  children: React.ReactNode;
}

export interface StepperNavigationProps {
  /** Navigation variant */
  variant?: 'horizontal' | 'vertical';
  /** Label orientation */
  labelOrientation?: 'horizontal' | 'vertical';
  /** Additional CSS classes */
  className?: string;
}

export interface StepperControlsProps {
  /** Previous button label */
  prevLabel?: string | ((isFirst: boolean) => string);
  /** Next button label */
  nextLabel?: string | ((isLast: boolean) => string);
  /** Loading text shown when submitting (only on last step) */
  loadingText?: string;
  /** Whether to show previous button */
  showPrev?: boolean;
  /** External loading state - overrides internal isSubmitting */
  loading?: boolean;
  /** Disable both buttons */
  disabled?: boolean;
  /** Callback when previous button is clicked (not on first step) */
  onPrev?: () => void;
  /** Callback when cancel is clicked (first step only) */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface StepperContextValue {
  /** All step configurations */
  steps: StepConfig[];
  /** Current step config */
  current: StepConfig;
  /** Current step index */
  currentIndex: number;
  /** Go to next step (triggers validation) */
  next: () => void;
  /** Go to previous step (no validation) */
  prev: () => void;
  /** Go to specific step by ID (only backwards without validation) */
  goTo: (stepId: string) => void;
  /** Whether current step is first */
  isFirst: boolean;
  /** Whether current step is last */
  isLast: boolean;
  /** Stepperize utils */
  utils: {
    getIndex: (id: string) => number;
  };
}

// ============================================================================
// Context Types
// ============================================================================

export interface FormContextValue<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Form metadata from Conform */
  form: FormMetadata<T>;
  /** Field metadata accessor */
  fields: Record<string, FieldMetadata<unknown>>;
  /** Whether form is currently submitting */
  isSubmitting: boolean;
  /** Submit the form */
  submit: () => void;
  /** Reset the form */
  reset: () => void;
  /** Form ID */
  formId: string;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseFieldReturn {
  /** Field metadata */
  field: FieldMetadata<unknown>;
  /** Input control for programmatic updates */
  control: {
    value: string | undefined;
    change: (value: string) => void;
    blur: () => void;
    focus: () => void;
  };
  /** Field meta information */
  meta: {
    name: string;
    id: string;
    errors: string[] | undefined;
    required: boolean;
    disabled: boolean;
  };
  /** Field errors */
  errors: string[] | undefined;
}

export interface UseWatchReturn<T = unknown> {
  /** Current field value */
  value: T;
}

// ============================================================================
// Dialog Form Types
// ============================================================================

export interface FormDialogProps<T extends z.ZodType> {
  // Dialog state
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Default open state for uncontrolled usage */
  defaultOpen?: boolean;

  // Dialog content
  /** Dialog title */
  title: string;
  /** Dialog description (optional) */
  description?: string;
  /** Trigger element to open the dialog */
  trigger?: React.ReactNode;

  // Form props
  /** Zod schema for validation */
  schema: T;
  /** Default form values */
  defaultValues?: Partial<z.infer<T>>;
  /** Client-side submit handler */
  onSubmit?: (data: z.infer<T>) => void | Promise<void>;
  /** Called after successful submission */
  onSuccess?: (data: z.infer<T>) => void;
  /** Called when validation fails */
  onError?: (error: z.ZodError<z.infer<T>>) => void;

  // Footer customization
  /** Submit button text (default: "Submit") */
  submitText?: string;
  /** Submit button text while loading */
  submitTextLoading?: string;
  /** Cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Whether to show cancel button (default: true) */
  showCancel?: boolean;
  /** Submit button type variant */
  submitType?: ButtonProps['type'];

  // Loading state
  /**
   * External loading state - use when submission is handled by external mutation.
   * When provided, this overrides the internal isSubmitting state.
   * @example
   * ```tsx
   * const mutation = useCreateUser();
   * <Form.Dialog loading={mutation.isPending} ... />
   * ```
   */
  loading?: boolean;

  // Styling
  /** Dialog content className */
  className?: string;
  /** Form className */
  formClassName?: string;

  /**
   * Dialog form children - can be either:
   * - ReactNode: Standard form fields
   * - Render function: For accessing form state (form, fields, isSubmitting, etc.)
   *
   * @example Standard usage
   * ```tsx
   * <Form.Dialog title="Add User" schema={schema} onSubmit={handleSubmit}>
   *   <Form.Field name="email"><Form.Input type="email" /></Form.Field>
   * </Form.Dialog>
   * ```
   *
   * @example Render function for form state access
   * ```tsx
   * <Form.Dialog title="Edit User" schema={schema} onSubmit={handleSubmit}>
   *   {({ form, fields, isSubmitting, reset }) => (
   *     <>
   *       <Form.Field name="email"><Form.Input type="email" /></Form.Field>
   *       <Button onClick={reset} disabled={isSubmitting}>Reset</Button>
   *     </>
   *   )}
   * </Form.Dialog>
   * ```
   */
  children: React.ReactNode | ((props: FormRootRenderProps) => React.ReactNode);
}
