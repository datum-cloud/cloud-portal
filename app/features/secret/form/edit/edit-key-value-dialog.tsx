import { Field } from '@/components/field/field';
import useAutosizeTextArea from '@/hooks/useAutosizeTextArea';
import { useUpdateSecret } from '@/resources/secrets';
import { isBase64, toBase64 } from '@/utils/helpers/text.helper';
import { getFormProps, getTextareaProps, useForm, useInputControl } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button, toast } from '@datum-ui/components';
import { Textarea } from '@datum-ui/components';
import { Dialog } from '@datum-ui/components/dialog';
import { useImperativeHandle, useRef, useState } from 'react';
import { Form } from 'react-router';
import { z } from 'zod';

interface EditKeyValueDialogProps {
  projectId?: string;
  secretId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export interface EditKeyValueDialogRef {
  show: (id?: string) => Promise<boolean>;
}

const keyValueSchema = z.object({
  value: z.string({ error: 'Value is required' }).min(1, { message: 'Value is required' }),
});

export const EditKeyValueDialog = ({
  projectId,
  secretId,
  ref,
  onSuccess,
  onCancel,
}: EditKeyValueDialogProps & {
  ref: React.RefObject<EditKeyValueDialogRef>;
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const resolveRef = useRef<(value: boolean) => void>(null);
  const [keyId, setKeyId] = useState<string | undefined>();

  const updateSecretMutation = useUpdateSecret(projectId ?? '', secretId ?? '', {
    onSuccess: () => {
      resolveRef.current?.(false);
      setIsOpen(false);
      toast.success(`Key "${keyId}" updated successfully`, {
        description: 'You have successfully updated the key-value pair.',
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Error', {
        description: error.message ?? 'An error occurred while updating the key-value pair',
      });
    },
  });

  const [form, fields] = useForm({
    id: 'secret-variables-form',
    constraint: getZodConstraint(keyValueSchema),
    defaultValue: { value: '' },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: keyValueSchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();

      if (submission?.status === 'success') {
        updateSecretMutation.mutate({
          data: {
            [keyId ?? '']: isBase64(submission?.value?.value)
              ? submission?.value?.value
              : toBase64(submission?.value?.value),
          },
        });
      }
    },
  });

  const valueControl = useInputControl(fields.value);

  useAutosizeTextArea(textAreaRef.current, fields.value.value ?? '', {
    maxHeight: '200px',
  });

  useImperativeHandle(ref, () => ({
    show: (id?: string) => {
      setKeyId(id);
      setIsOpen(true);
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
      });
    },
  }));

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resolveRef.current?.(false);
      onCancel?.();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Content>
        <Form {...getFormProps(form)} id={form.id} method="POST" autoComplete="off">
          <Dialog.Header
            title="Edit Key-Value Pair"
            description="If not already base64-encoded, values will be encoded automatically."
            onClose={() => handleOpenChange(false)}
            className="border-b"
          />
          <Dialog.Body className="px-5">
            <div className="space-y-4">
              <Field label="Key">
                <span className="text-sm">{keyId}</span>
              </Field>
              <Field isRequired label="Value" errors={fields.value.errors} className="w-full">
                <Textarea
                  {...getTextareaProps(fields.value)}
                  className="min-h-20 w-full"
                  rows={1}
                  key={fields.value.id}
                  ref={textAreaRef}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    const value = (e.target as HTMLTextAreaElement).value;
                    valueControl.change(value);
                  }}
                />
              </Field>
            </div>
          </Dialog.Body>
          <Dialog.Footer className="border-t">
            <Button
              type="quaternary"
              theme="borderless"
              disabled={updateSecretMutation.isPending}
              onClick={() => {
                handleOpenChange(false);
              }}>
              Cancel
            </Button>
            <Button
              htmlType="submit"
              form={form.id}
              disabled={updateSecretMutation.isPending}
              loading={updateSecretMutation.isPending}>
              {updateSecretMutation.isPending ? 'Saving' : 'Save'}
            </Button>
          </Dialog.Footer>
        </Form>
      </Dialog.Content>
    </Dialog>
  );
};

EditKeyValueDialog.displayName = 'EditKeyValueDialog';
