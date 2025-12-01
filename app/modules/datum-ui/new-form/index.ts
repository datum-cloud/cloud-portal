/**
 * Datum Form Library
 *
 * A compound component pattern form library built on top of Conform.js and Zod
 * for easy form creation with built-in validation, error handling, and accessibility features.
 *
 * @example Basic Usage
 * ```tsx
 * import { Form } from '@datum-ui/new-form';
 * import { z } from 'zod';
 *
 * const userSchema = z.object({
 *   name: z.string().min(2),
 *   email: z.string().email(),
 * });
 *
 * function UserForm() {
 *   return (
 *     <Form.Root schema={userSchema} onSubmit={(data) => console.log(data)}>
 *       <Form.Field name="name" label="Name" required>
 *         <Form.Input />
 *       </Form.Field>
 *       <Form.Field name="email" label="Email" required>
 *         <Form.Input type="email" />
 *       </Form.Field>
 *       <Form.Submit>Save</Form.Submit>
 *     </Form.Root>
 *   );
 * }
 * ```
 *
 * @example Multi-Step Form
 * ```tsx
 * const steps = [
 *   { id: 'account', label: 'Account', schema: accountSchema },
 *   { id: 'profile', label: 'Profile', schema: profileSchema },
 * ];
 *
 * <Form.Stepper steps={steps} onComplete={handleComplete}>
 *   <Form.StepperNavigation />
 *   <Form.Step id="account">...</Form.Step>
 *   <Form.Step id="profile">...</Form.Step>
 *   <Form.StepperControls />
 * </Form.Stepper>
 * ```
 *
 * @example Conditional Fields
 * ```tsx
 * <Form.Field name="contactMethod">
 *   <Form.Select>
 *     <Form.SelectItem value="email">Email</Form.SelectItem>
 *     <Form.SelectItem value="phone">Phone</Form.SelectItem>
 *   </Form.Select>
 * </Form.Field>
 *
 * <Form.When field="contactMethod" is="email">
 *   <Form.Field name="email"><Form.Input type="email" /></Form.Field>
 * </Form.When>
 * ```
 */
// Import all components
import {
  FormRoot,
  FormField,
  FormSubmit,
  FormButton,
  FormError,
  FormDescription,
  FormInput,
  FormTextarea,
  FormSelect,
  FormSelectItem,
  FormCheckbox,
  FormSwitch,
  FormRadioGroup,
  FormRadioItem,
  FormWhen,
  FormFieldArray,
  FormCustom,
  FormStepper,
  FormStep,
  StepperNavigation,
  StepperControls,
  FormDialog,
} from './components';
// Import hooks
import {
  useFormContext,
  useFieldContext,
  useField,
  useWatch,
  useWatchAll,
  useStepper,
} from './hooks';

/**
 * Form compound component
 *
 * Contains all form-related components as properties:
 * - Form.Root - Main form container
 * - Form.Field - Field wrapper with label and error handling
 * - Form.Input - Text input
 * - Form.Textarea - Multi-line text input
 * - Form.Select - Dropdown select
 * - Form.SelectItem - Select option
 * - Form.Checkbox - Checkbox input
 * - Form.Switch - Toggle switch
 * - Form.RadioGroup - Radio button group
 * - Form.RadioItem - Radio button option
 * - Form.Submit - Submit button with loading state
 * - Form.Error - Error display
 * - Form.Description - Helper text
 * - Form.When - Conditional rendering
 * - Form.FieldArray - Dynamic array of fields
 * - Form.Custom - Escape hatch for custom implementations
 * - Form.Stepper - Multi-step form container
 * - Form.Step - Individual step content
 * - Form.StepperNavigation - Step progress indicators
 * - Form.StepperControls - Previous/Next/Submit buttons
 *
 * Hooks available:
 * - Form.useFormContext - Access form context
 * - Form.useFieldContext - Access field context
 * - Form.useField - Access and control a specific field
 * - Form.useWatch - Watch a field's value
 * - Form.useWatchAll - Watch multiple fields
 * - Form.useStepper - Access stepper context
 */
export const Form = {
  // Core
  Root: FormRoot,
  Field: FormField,
  Submit: FormSubmit,
  Button: FormButton,
  Error: FormError,
  Description: FormDescription,

  // Inputs
  Input: FormInput,
  Textarea: FormTextarea,
  Select: FormSelect,
  SelectItem: FormSelectItem,
  Checkbox: FormCheckbox,
  Switch: FormSwitch,
  RadioGroup: FormRadioGroup,
  RadioItem: FormRadioItem,

  // Advanced
  When: FormWhen,
  FieldArray: FormFieldArray,
  Custom: FormCustom,

  // Stepper
  Stepper: FormStepper,
  Step: FormStep,
  StepperNavigation: StepperNavigation,
  StepperControls: StepperControls,

  // Dialog
  Dialog: FormDialog,

  // Hooks
  useFormContext,
  useFieldContext,
  useField,
  useWatch,
  useWatchAll,
  useStepper,
} as const;

// Named exports for direct imports
export {
  // Core
  FormRoot,
  FormField,
  FormSubmit,
  FormButton,
  FormError,
  FormDescription,

  // Inputs
  FormInput,
  FormTextarea,
  FormSelect,
  FormSelectItem,
  FormCheckbox,
  FormSwitch,
  FormRadioGroup,
  FormRadioItem,

  // Advanced
  FormWhen,
  FormFieldArray,
  FormCustom,

  // Stepper
  FormStepper,
  FormStep,
  StepperNavigation,
  StepperControls,

  // Dialog
  FormDialog,

  // Hooks
  useFormContext,
  useFieldContext,
  useField,
  useWatch,
  useWatchAll,
  useStepper,
};

// Export types
export type {
  FormRootProps,
  FormRootRenderProps,
  FormFieldProps,
  FormFieldRenderProps,
  FormFieldContextValue,
  FormInputProps,
  FormTextareaProps,
  FormSelectProps,
  FormSelectItemProps,
  FormCheckboxProps,
  FormSwitchProps,
  FormRadioGroupProps,
  FormRadioItemProps,
  FormSubmitProps,
  FormButtonProps,
  FormErrorProps,
  FormDescriptionProps,
  FormWhenProps,
  FormFieldArrayProps,
  FormFieldArrayRenderProps,
  FormCustomProps,
  FormCustomRenderProps,
  StepConfig,
  FormStepperProps,
  FormStepProps,
  StepperNavigationProps,
  StepperControlsProps,
  StepperContextValue,
  FormContextValue,
  UseFieldReturn,
  UseWatchReturn,
  FormDialogProps,
} from './types';
