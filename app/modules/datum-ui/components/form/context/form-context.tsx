import type { FormContextValue } from '../types';
import type { FieldMetadata } from '@conform-to/react';
import * as React from 'react';

const FormContext = React.createContext<FormContextValue | null>(null);

export interface FormProviderProps {
  children: React.ReactNode;
  value: FormContextValue;
}

export function FormProvider({ children, value }: FormProviderProps) {
  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
}

export function useFormContext<
  T extends Record<string, unknown> = Record<string, unknown>,
>(): FormContextValue<T> {
  const context = React.useContext(FormContext);

  if (!context) {
    throw new Error('useFormContext must be used within a Form.Root component');
  }

  return context as FormContextValue<T>;
}

/**
 * Get a specific field from the form context
 */
export function useFormField(name: string): FieldMetadata<unknown> | undefined {
  const { fields } = useFormContext();
  return fields[name];
}

/**
 * Check if the form is currently submitting
 */
export function useFormSubmitting(): boolean {
  const { isSubmitting } = useFormContext();
  return isSubmitting;
}

export { FormContext };
