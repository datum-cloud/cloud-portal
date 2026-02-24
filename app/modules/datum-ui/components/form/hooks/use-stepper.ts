import { useFormStepperContext } from '../components/stepper/form-stepper';
import type { StepConfig } from '../types';

/**
 * Return type for useStepper hook
 */
export interface UseStepperReturn {
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
export function useStepper(): UseStepperReturn {
  const context = useFormStepperContext();

  return {
    steps: context.steps,
    current: context.current,
    currentIndex: context.currentIndex,
    next: context.next,
    prev: context.prev,
    goTo: context.goTo,
    isFirst: context.isFirst,
    isLast: context.isLast,
    getStepData: context.getStepData,
    getAllStepData: context.getAllStepData,
  };
}
