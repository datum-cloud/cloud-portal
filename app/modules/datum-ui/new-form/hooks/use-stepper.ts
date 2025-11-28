'use client';

import { useStepperContext } from '../context/stepper-context';
import type { StepperContextValue } from '../types';

/**
 * Hook to access the stepper context
 * Must be used within a Form.Stepper component
 *
 * @example
 * ```tsx
 * function StepContent() {
 *   const {
 *     current,
 *     currentIndex,
 *     steps,
 *     next,
 *     prev,
 *     goTo,
 *     isFirst,
 *     isLast,
 *     getMetadata,
 *     setMetadata,
 *     allMetadata,
 *   } = useStepper();
 *
 *   return (
 *     <div>
 *       <h2>Step {currentIndex + 1}: {current.label}</h2>
 *       <button onClick={prev} disabled={isFirst}>Previous</button>
 *       <button onClick={next} disabled={isLast}>Next</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useStepper(): StepperContextValue {
  return useStepperContext();
}
