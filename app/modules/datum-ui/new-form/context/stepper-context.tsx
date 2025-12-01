'use client';

import type { StepConfig, StepperContextValue } from '../types';
import * as React from 'react';

const StepperContext = React.createContext<StepperContextValue | null>(null);

export interface StepperProviderProps {
  children: React.ReactNode;
  steps: StepConfig[];
  initialStep?: string;
  onStepChange?: (stepId: string, direction: 'next' | 'prev') => void;
}

export function StepperProvider({
  children,
  steps,
  initialStep,
  onStepChange,
}: StepperProviderProps) {
  const [currentIndex, setCurrentIndex] = React.useState(() => {
    if (initialStep) {
      const index = steps.findIndex((s) => s.id === initialStep);
      return index >= 0 ? index : 0;
    }
    return 0;
  });

  const [metadata, setMetadataState] = React.useState<Record<string, Record<string, unknown>>>({});

  const current = steps[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  const next = React.useCallback(() => {
    if (!isLast) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      onStepChange?.(steps[nextIndex].id, 'next');
    }
  }, [currentIndex, isLast, onStepChange, steps]);

  const prev = React.useCallback(() => {
    if (!isFirst) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      onStepChange?.(steps[prevIndex].id, 'prev');
    }
  }, [currentIndex, isFirst, onStepChange, steps]);

  const goTo = React.useCallback(
    (stepId: string) => {
      const index = steps.findIndex((s) => s.id === stepId);
      if (index >= 0 && index !== currentIndex) {
        const direction = index > currentIndex ? 'next' : 'prev';
        setCurrentIndex(index);
        onStepChange?.(stepId, direction);
      }
    },
    [currentIndex, onStepChange, steps]
  );

  const getMetadata = React.useCallback((stepId: string) => metadata[stepId], [metadata]);

  const setMetadata = React.useCallback((stepId: string, data: Record<string, unknown>) => {
    setMetadataState((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], ...data },
    }));
  }, []);

  const value: StepperContextValue = React.useMemo(
    () => ({
      steps,
      current,
      currentIndex,
      next,
      prev,
      goTo,
      isFirst,
      isLast,
      getMetadata,
      setMetadata,
      allMetadata: metadata,
    }),
    [
      steps,
      current,
      currentIndex,
      next,
      prev,
      goTo,
      isFirst,
      isLast,
      getMetadata,
      setMetadata,
      metadata,
    ]
  );

  return <StepperContext.Provider value={value}>{children}</StepperContext.Provider>;
}

export function useStepperContext(): StepperContextValue {
  const context = React.useContext(StepperContext);

  if (!context) {
    throw new Error('useStepperContext must be used within a Form.Stepper component');
  }

  return context;
}

/**
 * Optional stepper context - returns null if not within a Form.Stepper
 */
export function useOptionalStepperContext(): StepperContextValue | null {
  return React.useContext(StepperContext);
}

/**
 * Reset stepper to initial state
 */
export function useStepperReset() {
  const context = useStepperContext();

  return React.useCallback(() => {
    context.goTo(context.steps[0].id);
  }, [context]);
}

export { StepperContext };
