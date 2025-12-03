import { useStepperContext } from '../../context/stepper-context';
import type { StepperNavigationProps } from '../../types';
import { cn } from '@shadcn/lib/utils';
import * as React from 'react';

/**
 * Form.StepperNavigation - Step indicators/progress
 *
 * @example
 * ```tsx
 * <Form.StepperNavigation variant="horizontal" />
 * ```
 */
export function StepperNavigation({
  variant = 'horizontal',
  labelOrientation = 'vertical',
  className,
}: StepperNavigationProps) {
  const { steps, currentIndex } = useStepperContext();

  return (
    <nav
      aria-label="Form steps"
      className={cn(
        'flex',
        variant === 'horizontal' ? 'flex-row items-start' : 'flex-col',
        className
      )}>
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.id}
            className={cn(
              'flex',
              variant === 'horizontal'
                ? cn('flex-1 items-center', labelOrientation === 'vertical' && 'flex-col')
                : 'flex-row items-start'
            )}>
            {/* Step indicator */}
            <div className="flex items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                  isActive && 'border-primary bg-primary text-primary-foreground',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  !isActive && !isCompleted && 'border-muted-foreground/30 text-muted-foreground'
                )}
                aria-current={isActive ? 'step' : undefined}>
                {isCompleted ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>

              {/* Connector line for horizontal */}
              {variant === 'horizontal' && !isLast && labelOrientation !== 'vertical' && (
                <div
                  className={cn(
                    'mx-2 h-0.5 min-w-8 flex-1',
                    isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>

            {/* Label container */}
            <div
              className={cn(
                variant === 'horizontal' && labelOrientation === 'vertical'
                  ? 'mt-2 text-center'
                  : variant === 'vertical'
                    ? 'ml-3 pb-8'
                    : 'ml-2'
              )}>
              <span
                className={cn(
                  'text-sm font-medium',
                  isActive && 'text-foreground',
                  isCompleted && 'text-foreground',
                  !isActive && !isCompleted && 'text-muted-foreground'
                )}>
                {step.label}
              </span>
              {step.description && (
                <p className="text-muted-foreground mt-0.5 text-xs">{step.description}</p>
              )}
            </div>

            {/* Connector line for horizontal with vertical labels */}
            {variant === 'horizontal' && !isLast && labelOrientation === 'vertical' && (
              <div
                className={cn(
                  'mx-2 mt-4 h-0.5 flex-1',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            )}

            {/* Connector line for vertical */}
            {variant === 'vertical' && !isLast && (
              <div
                className={cn(
                  'ml-4 min-h-8 w-0.5 flex-1',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

StepperNavigation.displayName = 'Form.StepperNavigation';
