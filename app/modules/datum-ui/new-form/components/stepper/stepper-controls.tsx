'use client';

import { useFormContext } from '../../context/form-context';
import { useStepperContext } from '../../context/stepper-context';
import type { StepperControlsProps } from '../../types';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';

/**
 * Form.StepperControls - Navigation buttons (Previous/Next/Submit)
 *
 * @example
 * ```tsx
 * <Form.StepperControls
 *   prevLabel={(isFirst) => isFirst ? 'Cancel' : 'Previous'}
 *   nextLabel={(isLast) => isLast ? 'Submit' : 'Next'}
 * />
 * ```
 */
export function StepperControls({
  prevLabel = 'Previous',
  nextLabel = (isLast: boolean) => (isLast ? 'Submit' : 'Next'),
  showPrev = true,
  className,
}: StepperControlsProps) {
  const { prev, isFirst, isLast } = useStepperContext();
  const { isSubmitting } = useFormContext();

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

  return (
    <div className={cn('flex items-center justify-between pt-4', className)}>
      <div>
        {showPrev && (
          <Button
            htmlType="button"
            type="quaternary"
            theme="borderless"
            onClick={prev}
            disabled={isFirst || isSubmitting}>
            {getPrevLabel()}
          </Button>
        )}
      </div>

      <Button htmlType="submit" type="primary" loading={isSubmitting} disabled={isSubmitting}>
        {isSubmitting && isLast ? 'Submitting...' : getNextLabel()}
      </Button>
    </div>
  );
}

StepperControls.displayName = 'Form.StepperControls';
