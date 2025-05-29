import { LabelForm } from './label-form';
import {
  DialogContent,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LabelFormSchema } from '@/resources/schemas/metadata.schema';
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Label</DialogTitle>
          <DialogDescription>
            Create labels to organize resources. Use key/value pairs to categorize and filter
            objects.
          </DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
};

LabelFormDialog.displayName = 'LabelFormDialog';
