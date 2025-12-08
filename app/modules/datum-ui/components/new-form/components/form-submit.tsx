import { useFormContext } from '../context/form-context';
import type { FormSubmitProps } from '../types';
import { Button } from '@datum-ui/components';

/**
 * Form.Submit - Submit button with automatic loading state
 *
 * @example
 * ```tsx
 * <Form.Submit loadingText="Saving...">
 *   Save Changes
 * </Form.Submit>
 * ```
 */
export function FormSubmit({ children, loadingText, loading = false, ...props }: FormSubmitProps) {
  const { isSubmitting } = useFormContext();

  const isLoading = loading || isSubmitting;

  return (
    <Button htmlType="submit" disabled={props.disabled || isLoading} loading={isLoading} {...props}>
      {isLoading && loadingText ? loadingText : children}
    </Button>
  );
}

FormSubmit.displayName = 'Form.Submit';
