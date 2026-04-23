import { useUpdateSecret } from '@/resources/secrets';
import { isBase64, toBase64 } from '@/utils/helpers/text.helper';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useImperativeHandle, useRef, useState } from 'react';
import { z } from 'zod';

interface EditKeyValueDialogProps {
  projectId?: string;
  secretId?: string;
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
  onCancel,
}: EditKeyValueDialogProps & {
  ref: React.RefObject<EditKeyValueDialogRef>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const resolveRef = useRef<(value: boolean) => void>(null);
  const [keyId, setKeyId] = useState<string | undefined>();

  const updateSecretMutation = useUpdateSecret(projectId ?? '', secretId ?? '', {
    onSuccess: () => {
      resolveRef.current?.(false);
      setIsOpen(false);
      toast.success('Key', {
        description: `Key "${keyId}" has been updated successfully`,
      });
    },
    onError: (error) => {
      toast.error('Key', {
        description: error.message ?? 'An error occurred while updating the key-value pair',
      });
    },
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

  const handleSubmit = async (data: z.infer<typeof keyValueSchema>) => {
    await updateSecretMutation.mutateAsync({
      data: {
        [keyId ?? '']: isBase64(data.value) ? data.value : toBase64(data.value),
      },
    });
  };

  return (
    <Form.Dialog
      key={isOpen ? `edit-${keyId}` : 'closed'}
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="Edit Key-Value Pair"
      description="If not already base64-encoded, values will be encoded automatically."
      schema={keyValueSchema}
      defaultValues={{ value: '' }}
      onSubmit={handleSubmit}
      loading={updateSecretMutation.isPending}
      submitText="Save"
      submitTextLoading="Saving...">
      <div className="space-y-4 px-5">
        <div>
          <span className="text-foreground/80 text-xs font-semibold">Key</span>
          <p className="mt-1 text-sm">{keyId}</p>
        </div>
        <Form.Field name="value" label="Value" required>
          <Form.Textarea placeholder="value" className="min-h-20" rows={1} />
        </Form.Field>
      </div>
    </Form.Dialog>
  );
};

EditKeyValueDialog.displayName = 'EditKeyValueDialog';
