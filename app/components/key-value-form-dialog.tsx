import { Form } from '@datum-cloud/datum-ui/form';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import type { z } from 'zod';

type KeyValueData = { key: string; value: string };
type KeyValueSchema = z.ZodType<KeyValueData>;

export interface KeyValueFormDialogRef {
  show: (defaultValue?: KeyValueData) => void;
  hide: () => void;
}

interface KeyValueFormDialogProps {
  schema: KeyValueSchema;
  title: string;
  description: string;
  onSubmit: (data: KeyValueData) => void;
  onClose?: () => void;
}

export const KeyValueFormDialog = forwardRef<KeyValueFormDialogRef, KeyValueFormDialogProps>(
  ({ schema, title, description, onSubmit, onClose }, ref) => {
    const [open, setOpen] = useState(false);
    const [defaultValues, setDefaultValues] = useState<KeyValueData | undefined>();

    const show = useCallback((value?: KeyValueData) => {
      setDefaultValues(value);
      setOpen(true);
    }, []);

    const hide = useCallback(() => setOpen(false), []);

    useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

    const handleSubmit = useCallback(
      (data: KeyValueData) => {
        onSubmit(data);
        setOpen(false);
      },
      [onSubmit]
    );

    const handleOpenChange = useCallback(
      (isOpen: boolean) => {
        if (!isOpen) onClose?.();
        setOpen(isOpen);
      },
      [onClose]
    );

    return (
      <Form.Dialog
        key={open ? `open-${defaultValues?.key ?? 'new'}` : 'closed'}
        open={open}
        onOpenChange={handleOpenChange}
        title={title}
        description={description}
        schema={schema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitText="Save"
        className="sm:max-w-lg">
        <div className="space-y-4 px-5 py-5">
          <Form.Field name="key" label="Key" required>
            <Form.Input autoFocus placeholder="e.g. app" />
          </Form.Field>
          <Form.Field name="value" label="Value" required>
            <Form.Input placeholder="e.g. Nginx" />
          </Form.Field>
        </div>
      </Form.Dialog>
    );
  }
);

KeyValueFormDialog.displayName = 'KeyValueFormDialog';
