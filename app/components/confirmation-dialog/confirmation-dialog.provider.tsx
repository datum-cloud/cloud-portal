import {
  ConfirmationDialog,
  type ConfirmationDialogProps,
  type ConfirmationDialogRef,
} from '@/components/confirmation-dialog/confirmation-dialog';
import { createContext, useCallback, useContext, useRef } from 'react';

const ConfirmationContext = createContext<{
  confirm: (options: ConfirmationDialogProps) => Promise<boolean>;
} | null>(null);

export function ConfirmationDialogProvider({ children }: { children: React.ReactNode }) {
  const confirmRef = useRef<ConfirmationDialogRef>(null!);

  const confirm = useCallback(async (options: ConfirmationDialogProps) => {
    return (await confirmRef.current?.show(options)) ?? false;
  }, []);

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationDialog ref={confirmRef} />
    </ConfirmationContext.Provider>
  );
}

export function useConfirmationDialog() {
  const context = useContext(ConfirmationContext);

  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }

  return context;
}
