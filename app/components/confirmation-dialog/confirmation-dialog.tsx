import { Alert, AlertDescription, AlertTitle } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { Input, Label } from '@datum-ui/components';
import { Dialog } from '@datum-ui/components/dialog';
import { IconWrapper } from '@datum-ui/components/icons/icon-wrapper';
import { AlertCircle } from 'lucide-react';
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

export interface ConfirmationDialogProps {
  title?: string;
  description?: string | React.ReactNode;
  submitText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onSubmit?: () => Promise<void>;

  // Alert
  showAlert?: boolean;
  alertVariant?: 'default' | 'destructive';
  alertTitle?: string;
  alertDescription?: string | React.ReactNode;
  alertIcon?: React.ReactNode;
  alertClassName?: string;

  // Confirmation
  showConfirmInput?: boolean;
  confirmInputLabel?: string;
  confirmInputPlaceholder?: string;
  confirmValue?: string;
}

export interface ConfirmationDialogRef {
  show: (options: ConfirmationDialogProps) => Promise<boolean>;
  close: () => void;
}

export const ConfirmationDialog = ({
  ref,
}: ConfirmationDialogProps & {
  ref: React.RefObject<ConfirmationDialogRef>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const [confirmValidationValue, setConfirmValidationValue] = useState('');

  const defaultDialogProps: ConfirmationDialogProps = {
    title: '',
    description: '',
    submitText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'destructive',

    // Alert
    showAlert: false,
    alertIcon: <IconWrapper icon={AlertCircle} />,
    alertTitle: '',
    alertDescription: '',
    alertVariant: 'default',

    // Confirmation
    showConfirmInput: false,
    confirmInputLabel: 'Type "DELETE" to confirm.',
    confirmInputPlaceholder: 'Type in here...',
    confirmValue: 'DELETE',
  };

  const [dialogProps, setDialogProps] = useState<ConfirmationDialogProps>(defaultDialogProps);

  const resolveRef = useRef<(value: boolean) => void>(null);

  useImperativeHandle(ref, () => ({
    show: (options) => {
      setDialogProps({ ...defaultDialogProps, ...options });
      setIsOpen(true);
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
      });
    },
    close: () => {
      setIsOpen(false);
    },
  }));

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resolveRef.current?.(false);
    }
    setIsOpen(open);
  };

  const handleConfirm = async () => {
    if (isDisabled) return;

    setIsPending(true);
    try {
      if (dialogProps.onSubmit) {
        await dialogProps.onSubmit();
      }
      resolveRef.current?.(true);
    } finally {
      setIsPending(false);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    resolveRef.current?.(false);
    setIsOpen(false);
  };

  const isDisabled = useMemo(() => {
    if (dialogProps.showConfirmInput) {
      return confirmValidationValue !== (dialogProps.confirmValue ?? 'DELETE');
    }

    return isPending;
  }, [dialogProps, confirmValidationValue, isPending]);

  useEffect(() => {
    if (isOpen) {
      setConfirmValidationValue('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Content>
        <Dialog.Header
          title={dialogProps.title}
          description={dialogProps.description}
          onClose={handleCancel}
        />
        {dialogProps.showAlert || dialogProps.showConfirmInput ? (
          <Dialog.Body className="px-5 py-0">
            {dialogProps.showAlert && (
              <Alert variant={dialogProps.alertVariant} className={dialogProps.alertClassName}>
                {dialogProps.alertIcon}
                <AlertTitle>{dialogProps.alertTitle}</AlertTitle>
                <AlertDescription>{dialogProps.alertDescription}</AlertDescription>
              </Alert>
            )}
            {dialogProps.showConfirmInput && (
              <div className="mb-1 flex flex-col gap-3">
                <Label>{dialogProps.confirmInputLabel}</Label>
                <Input
                  type="text"
                  placeholder={dialogProps.confirmInputPlaceholder}
                  value={confirmValidationValue}
                  onChange={(e) => setConfirmValidationValue(e.target.value)}
                />
              </div>
            )}
          </Dialog.Body>
        ) : (
          <></>
        )}

        <Dialog.Footer>
          <Button type="quaternary" theme="borderless" onClick={handleCancel} disabled={isPending}>
            {dialogProps.cancelText}
          </Button>
          <Button
            type={dialogProps.variant === 'destructive' ? 'danger' : 'primary'}
            theme="solid"
            onClick={handleConfirm}
            disabled={isDisabled || isPending}
            loading={isPending}>
            {dialogProps.submitText}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
};

ConfirmationDialog.displayName = 'ConfirmationDialog';
