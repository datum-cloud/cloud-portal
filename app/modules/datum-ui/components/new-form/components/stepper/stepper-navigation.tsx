import type { StepperNavigationProps } from '../../types';
import { useFormStepperContext } from './form-stepper';
import { cn } from '@shadcn/lib/utils';
import { CheckIcon } from 'lucide-react';
import * as React from 'react';

/**
 * Form.StepperNavigation - Step indicators/progress
 *
 * Displays visual step indicators showing current progress through the form.
 * Supports horizontal and vertical variants with optional label orientation.
 *
 * @example
 * ```tsx
 * <Form.StepperNavigation variant="horizontal" labelOrientation="vertical" />
 * ```
 */
export function StepperNavigation({
  variant = 'horizontal',
  labelOrientation = 'vertical',
  className,
}: StepperNavigationProps) {
  const { steps, currentIndex } = useFormStepperContext();

  if (variant === 'horizontal' && labelOrientation === 'vertical') {
    // Horizontal with vertical labels - use relative positioning for connector
    return (
      <nav
        aria-label="Form steps"
        className={cn('flex flex-row items-start justify-between', className)}>
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative flex flex-1 flex-col items-center">
              {/* Connector line - positioned absolutely between circles */}
              {!isLast && (
                <div className="bg-stepper-line absolute top-4 right-[calc(-50%+20px)] left-[calc(50%+20px)] h-0.5" />
              )}

              {/* Step indicator */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-transparent text-sm font-medium transition-colors',
                  isActive && 'border-primary bg-primary text-primary-foreground',
                  isCompleted && 'border-tertiary-foreground bg-tertiary-foreground text-tertiary',
                  !isActive && !isCompleted && 'border-stepper-label text-stepper-label'
                )}
                aria-current={isActive ? 'step' : undefined}>
                {isCompleted ? <CheckIcon className="text-tertiary h-4 w-4" /> : index + 1}
              </div>

              {/* Label */}
              <div className="mt-1">
                <span
                  className={cn(
                    'text-xs font-medium',
                    isActive && 'text-foreground',
                    isCompleted && 'text-stepper-label',
                    !isActive && !isCompleted && 'text-stepper-label'
                  )}>
                  {step.label}
                </span>
                {step.description && (
                  <p className="text-muted-foreground mt-0.5 text-xs">{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </nav>
    );
  }

  if (variant === 'horizontal') {
    // Horizontal with horizontal labels
    return (
      <nav aria-label="Form steps" className={cn('flex flex-row items-center', className)}>
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center">
                {/* Step indicator */}
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition-colors',
                    isActive && 'border-primary bg-primary text-primary-foreground',
                    isCompleted &&
                      'border-tertiary-foreground bg-tertiary-foreground text-tertiary',
                    !isActive && !isCompleted && 'border-stepper-label text-stepper-label'
                  )}
                  aria-current={isActive ? 'step' : undefined}>
                  {isCompleted ? <CheckIcon className="text-tertiary size-4" /> : index + 1}
                </div>

                {/* Label */}
                <div className="ml-2">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isActive && 'text-foreground',
                      isCompleted && 'text-stepper-label',
                      !isActive && !isCompleted && 'text-stepper-label'
                    )}>
                    {step.label}
                  </span>
                </div>
              </div>

              {/* Connector line */}
              {!isLast && <div className="bg-stepper-line mx-4 h-0.5 min-w-8 flex-1" />}
            </React.Fragment>
          );
        })}
      </nav>
    );
  }

  // Vertical variant
  return (
    <nav aria-label="Form steps" className={cn('flex flex-col', className)}>
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex flex-row">
            <div className="flex flex-col items-center">
              {/* Step indicator */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition-colors',
                  isActive && 'border-primary bg-primary text-primary-foreground',
                  isCompleted && 'border-tertiary-foreground bg-tertiary-foreground text-tertiary',
                  !isActive && !isCompleted && 'border-stepper-label text-stepper-label'
                )}
                aria-current={isActive ? 'step' : undefined}>
                {isCompleted ? <CheckIcon className="text-tertiary size-4" /> : index + 1}
              </div>

              {/* Connector line */}
              {!isLast && <div className="bg-stepper-line my-1 min-h-8 w-0.5 flex-1" />}
            </div>

            {/* Label */}
            <div className="ml-3 pb-8">
              <span
                className={cn(
                  'text-sm font-medium',
                  isActive && 'text-foreground',
                  isCompleted && 'text-stepper-label',
                  !isActive && !isCompleted && 'text-stepper-label'
                )}>
                {step.label}
              </span>
              {step.description && (
                <p className="text-muted-foreground mt-0.5 text-xs">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

StepperNavigation.displayName = 'Form.StepperNavigation';
