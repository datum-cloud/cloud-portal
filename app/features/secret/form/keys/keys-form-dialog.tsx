import { KeyValueFieldArray } from '@/features/secret/form/key-value-field-array';
import { showMutationErrorToast } from '@/modules/quota';
import type { SecretVariablesSchema } from '@/resources/secrets';
import { secretVariablesSchema, toSecretData, useUpdateSecret } from '@/resources/secrets';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useImperativeHandle, useRef, useState } from 'react';

interface VariablesFormDialogProps {
  projectId?: string;
  secretId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export interface VariablesFormDialogRef {
  show: (defaultValue?: SecretVariablesSchema) => Promise<boolean>;
}

export const KeysFormDialog = ({
  projectId,
  secretId,
  ref,
  onSuccess,
  onCancel,
}: VariablesFormDialogProps & {
  ref: React.RefObject<VariablesFormDialogRef>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const resolveRef = useRef<(value: boolean) => void>(null);
  const [defaultValues, setDefaultValues] = useState<SecretVariablesSchema | undefined>({
    variables: [{ key: '', value: '' }],
  });

  const updateSecretMutation = useUpdateSecret(projectId ?? '', secretId ?? '', {
    onSuccess: () => {
      resolveRef.current?.(false);
      setIsOpen(false);
      toast.success('Key', {
        description: `Keys have been added successfully`,
      });
      onSuccess?.();
    },
    onError: (error) =>
      showMutationErrorToast(error, {
        fallbackTitle: 'Key',
        fallbackDescription: error.message || 'An error occurred while updating the key-value pair',
        scope: 'project',
        projectId,
      }),
  });

  useImperativeHandle(ref, () => ({
    show: (value?: SecretVariablesSchema) => {
      setDefaultValues(value ?? { variables: [{ key: '', value: '' }] });
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

  const handleSubmit = async (data: SecretVariablesSchema) => {
    await updateSecretMutation.mutateAsync({ data: toSecretData(data.variables ?? []) });
  };

  return (
    <Form.Dialog
      key={isOpen ? 'open' : 'closed'}
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="Add Key-Value Pairs"
      description="Enter plain-text values. They are base64-encoded automatically."
      schema={secretVariablesSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      loading={updateSecretMutation.isPending}
      submitText="Create"
      submitTextLoading="Creating..."
      className="w-full sm:w-2xl sm:max-w-3xl">
      <div className="px-5">
        <KeyValueFieldArray />
      </div>
    </Form.Dialog>
  );
};

KeysFormDialog.displayName = 'KeysFormDialog';
