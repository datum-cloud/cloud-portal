import { LabelForm } from './label-form';
import { LabelFormSchema } from '@/resources/base';
import { Dialog } from '@datum-ui/components/dialog';
import { useImperativeHandle, useRef, useState } from 'react';

interface LabelFormDialogProps {
  onSubmit: (label: LabelFormSchema) => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export interface LabelFormDialogRef {
  show: (defaultValue?: LabelFormSchema) => Promise<boolean>;
}

export const LabelFormDialog = ({
  ref,
  onSubmit,
  onCancel,
  onClose,
}: LabelFormDialogProps & {
  ref: React.RefObject<LabelFormDialogRef>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const resolveRef = useRef<(value: boolean) => void>(null);
  const [defaultValue, setDefaultValue] = useState<LabelFormSchema | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    show: (value?: LabelFormSchema) => {
      setIsOpen(true);
      setDefaultValue(value);
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
      });
    },
  }));

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resolveRef.current?.(false);
      onClose?.();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Content>
        <Dialog.Header
          title="Add Label"
          description="Create labels to organize resources. Use key/value pairs to categorize and filter objects."
          onClose={() => {
            onCancel?.();
            setIsOpen(false);
          }}
        />
        <Dialog.Body className="px-5">
          <LabelForm
            defaultValue={defaultValue}
            onSubmit={(value) => {
              onSubmit?.(value);
              setIsOpen(false);
            }}
            onCancel={() => {
              onCancel?.();
              setIsOpen(false);
            }}
          />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
};

LabelFormDialog.displayName = 'LabelFormDialog';
