import type { FormDialogProps, FormRootRenderProps } from '../types';
import { Dialog } from '@datum-ui/components/dialog';
import { Form } from '@datum-ui/components/new-form';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';
import type { z } from 'zod';

/**
 * Form.Dialog - A dialog with an integrated form
 *
 * Combines Dialog and Form.Root into a single component with:
 * - Automatic dialog state management (controlled or uncontrolled)
 * - Built-in header with title and description
 * - Built-in footer with submit and cancel buttons
 * - Auto-close on successful submission
 * - Prevents accidental close during submission
 * - Supports render function pattern for form state access
 *
 * @example Basic usage
 * ```tsx
 * <Form.Dialog
 *   title="Add User"
 *   description="Enter user details"
 *   schema={userSchema}
 *   onSubmit={handleSubmit}
 *   trigger={<Button>Add User</Button>}
 * >
 *   <Form.Field name="name" label="Name" required>
 *     <Form.Input />
 *   </Form.Field>
 *   <Form.Field name="email" label="Email" required>
 *     <Form.Input type="email" />
 *   </Form.Field>
 * </Form.Dialog>
 * ```
 *
 * @example With render function for form state access
 * ```tsx
 * <Form.Dialog
 *   title="Edit User"
 *   schema={userSchema}
 *   defaultValues={user}
 *   onSubmit={handleSubmit}
 *   trigger={<Button>Edit</Button>}
 * >
 *   {({ form, fields, isSubmitting, reset }) => (
 *     <>
 *       <Form.Field name="name" label="Name">
 *         <Form.Input />
 *       </Form.Field>
 *       <Button variant="ghost" onClick={reset} disabled={isSubmitting}>
 *         Reset
 *       </Button>
 *     </>
 *   )}
 * </Form.Dialog>
 * ```
 */
export function FormDialog<T extends z.ZodType>({
  // Dialog props
  open,
  onOpenChange,
  defaultOpen,
  title,
  description,
  trigger,

  // Form props
  schema,
  defaultValues,
  onSubmit,
  onSuccess,
  onError,

  // Footer props
  submitText = 'Submit',
  submitTextLoading = 'Submitting...',
  cancelText = 'Cancel',
  showCancel = true,
  submitType = 'primary',

  // Behavior
  closeOnSuccess = true,

  // Styling
  className,
  formClassName,

  // Children
  children,
}: FormDialogProps<T>) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Determine if controlled or uncontrolled
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      // Prevent closing while submitting
      if (!value && isSubmitting) {
        return;
      }

      if (!isControlled) {
        setInternalOpen(value);
      }
      onOpenChange?.(value);
    },
    [isControlled, isSubmitting, onOpenChange]
  );

  const handleSubmit = React.useCallback(
    async (data: z.infer<T>) => {
      setIsSubmitting(true);
      try {
        await onSubmit?.(data);
        onSuccess?.(data);
        if (closeOnSuccess) {
          handleOpenChange(false);
        }
      } catch (error) {
        console.error('Form submission error:', error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, onSuccess, closeOnSuccess, handleOpenChange]
  );

  const handleCancel = React.useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <Dialog.Trigger>{trigger}</Dialog.Trigger>}

      <Dialog.Content className={className}>
        <Dialog.Header title={title} description={description} onClose={handleCancel} />

        <Form.Root
          schema={schema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onError={onError}
          isSubmitting={isSubmitting}
          mode="onSubmit"
          className={cn('space-y-0', formClassName)}>
          {(renderProps: FormRootRenderProps) => (
            <>
              <Dialog.Body className="space-y-0">
                {/* Render children - support both patterns */}
                {typeof children === 'function' ? children(renderProps) : children}
              </Dialog.Body>
              <Dialog.Footer>
                {showCancel && (
                  <Form.Button
                    type="quaternary"
                    theme="outline"
                    onClick={handleCancel}
                    disableOnSubmit>
                    {cancelText}
                  </Form.Button>
                )}
                <Form.Submit type={submitType}>
                  {isSubmitting ? submitTextLoading : submitText}
                </Form.Submit>
              </Dialog.Footer>
            </>
          )}
        </Form.Root>
      </Dialog.Content>
    </Dialog>
  );
}

FormDialog.displayName = 'Form.Dialog';
