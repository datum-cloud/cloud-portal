import { AnnotationForm } from './annotations-form';
import {
  DialogContent,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AnnotationFormSchema } from '@/resources/schemas/metadata.schema';
import { useImperativeHandle, useRef, useState } from 'react';

interface AnnotationFormDialogProps {
  onSubmit: (annotation: AnnotationFormSchema) => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export interface AnnotationFormDialogRef {
  show: (defaultValue?: AnnotationFormSchema) => Promise<boolean>;
}

export const AnnotationFormDialog = ({
  ref,
  onSubmit,
  onCancel,
  onClose,
}: AnnotationFormDialogProps & {
  ref: React.RefObject<AnnotationFormDialogRef>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const resolveRef = useRef<(value: boolean) => void>(null);
  const [defaultValue, setDefaultValue] = useState<AnnotationFormSchema | undefined>(undefined);

  useImperativeHandle(ref, () => ({
    show: (value?: AnnotationFormSchema) => {
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
          <DialogTitle>Add Annotation</DialogTitle>
          <DialogDescription>
            Create annotations to organize resources. Use key/value pairs to categorize and filter
            objects.
          </DialogDescription>
        </DialogHeader>
        <AnnotationForm
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

AnnotationFormDialog.displayName = 'AnnotationFormDialog';
