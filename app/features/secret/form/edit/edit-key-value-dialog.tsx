import { Field } from '@/components/field/field';
import useAutosizeTextArea from '@/hooks/useAutosizeTextArea';
import { useIsPending } from '@/hooks/useIsPending';
import { ROUTE_PATH as SECRET_ACTIONS_ROUTE_PATH } from '@/routes/api/secrets';
import { isBase64, toBase64 } from '@/utils/helpers/text.helper';
import { getFormProps, getTextareaProps, useForm, useInputControl } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button, toast } from '@datum-ui/components';
import { Textarea } from '@datum-ui/components';
import { Dialog } from '@datum-ui/components/dialog';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Form, useFetcher } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';
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
  const fetcher = useFetcher({ key: 'edit-key-value' });
  const isPending = useIsPending({ fetcherKey: 'edit-key-value' });
  const csrf = useAuthenticityToken();

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const resolveRef = useRef<(value: boolean) => void>(null);
  const [keyId, setKeyId] = useState<string | undefined>();

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
        fetcher.submit(
          {
            projectId: projectId ?? '',
            secretId: secretId ?? '',
            data: {
              [keyId ?? '']: isBase64(submission?.value?.value)
                ? submission?.value?.value
                : toBase64(submission?.value?.value),
            },
            csrf,
          },
          {
            action: SECRET_ACTIONS_ROUTE_PATH,
            encType: 'application/json',
            method: 'PATCH',
          }
        );
      }
    },
  });

  const valueControl = useInputControl(fields.value);

  useAutosizeTextArea(textAreaRef.current, fields.value.value ?? '', {
    maxHeight: '200px',
  });

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success } = fetcher.data;

      if (success) {
        handleOpenChange(false);
        toast.success(`Key "${keyId}" updated successfully`, {
          description: 'You have successfully updated the key-value pair.',
        });
        onSuccess?.();
      } else {
        toast.error('Error', {
          description: fetcher.data.error ?? 'An error occurred while updating the key-value pair',
        });
      }
    }
  }, [fetcher.data, fetcher.state]);

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
              disabled={isPending}
              onClick={() => {
                handleOpenChange(false);
              }}>
              Cancel
            </Button>
            <Button htmlType="submit" form={form.id} disabled={isPending} loading={isPending}>
              {isPending ? 'Saving' : 'Save'}
            </Button>
          </Dialog.Footer>
        </Form>
      </Dialog.Content>
    </Dialog>
  );
};

EditKeyValueDialog.displayName = 'EditKeyValueDialog';
