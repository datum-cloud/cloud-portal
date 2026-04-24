import { KeyValueFieldArray } from '@/features/secret/form/key-value-field-array';
import type { SecretVariablesSchema } from '@/resources/secrets';
import { secretVariablesSchema, useUpdateSecret } from '@/resources/secrets';
import { isBase64, toBase64 } from '@/utils/helpers/text.helper';
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
    onError: (error) => {
      toast.error('Key', {
        description: error.message ?? 'An error occurred while updating the key-value pair',
      });
    },
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
    const encodedData = (data.variables ?? []).reduce(
      (acc, vars) => {
        acc[vars.key] = isBase64(vars.value) ? vars.value : toBase64(vars.value);
        return acc;
      },
      {} as Record<string, string>
    );

    await updateSecretMutation.mutateAsync({ data: encodedData });
  };

  return (
    <Form.Dialog
      key={isOpen ? 'open' : 'closed'}
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="Add Key-Value Pairs"
      description="If not already base64-encoded, values will be encoded automatically."
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
