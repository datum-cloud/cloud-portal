import { useFormContext } from '../../context/form-context';
import type { StepperControlsProps } from '../../types';
import { useFormStepperContext } from './form-stepper';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';

/**
 * Form.StepperControls - Navigation buttons (Previous/Next/Submit)
 *
 * Provides Previous and Next/Submit buttons for navigating between steps.
 * The Next button triggers form validation before advancing.
 * The Previous button navigates back without validation.
 *
 * @example
 * ```tsx
 * <Form.StepperControls
 *   prevLabel={(isFirst) => isFirst ? 'Cancel' : 'Previous'}
 *   nextLabel={(isLast) => isLast ? 'Submit' : 'Next'}
 *   loadingText="Creating..."
 *   onCancel={() => setOpen(false)}
 * />
 * ```
 *
 * @example With external loading state
 * ```tsx
 * <Form.StepperControls
 *   loading={fetcher.state === 'submitting'}
 *   disabled={!isValid}
 *   loadingText="Saving..."
 * />
 * ```
 */
export function StepperControls({
  prevLabel = 'Previous',
  nextLabel = (isLast: boolean) => (isLast ? 'Submit' : 'Next'),
  loadingText = 'Submitting...',
  showPrev = true,
  loading,
  disabled,
  onPrev,
  onCancel,
  className,
}: StepperControlsProps) {
  const { prev, isFirst, isLast } = useFormStepperContext();
  const { isSubmitting: formIsSubmitting } = useFormContext();

  // Use external loading state if provided, otherwise use internal form state
  const isLoading = loading ?? formIsSubmitting;
  const isDisabled = disabled ?? false;

  const getPrevLabel = () => {
    if (typeof prevLabel === 'function') {
      return prevLabel(isFirst);
    }
    return prevLabel;
  };

  const getNextLabel = () => {
    if (typeof nextLabel === 'function') {
      return nextLabel(isLast);
    }
    return nextLabel;
  };

  const handlePrev = () => {
    if (isFirst && onCancel) {
      onCancel();
    } else {
      onPrev?.();
      prev();
    }
  };

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div>
        {showPrev && (
          <Button
            htmlType="button"
            type="quaternary"
            theme="outline"
            size="small"
            onClick={handlePrev}
            disabled={isLoading || isDisabled}>
            {getPrevLabel()}
          </Button>
        )}
      </div>

      <Button
        htmlType="submit"
        type="primary"
        size="small"
        loading={isLoading}
        disabled={isLoading || isDisabled}>
        {isLoading && isLast ? loadingText : getNextLabel()}
      </Button>
    </div>
  );
}

StepperControls.displayName = 'Form.StepperControls';
