import { KeysForm } from './keys-form';
import { SecretVariablesSchema, secretVariablesSchema, useUpdateSecret } from '@/resources/secrets';
import { isBase64, toBase64 } from '@/utils/helpers/text.helper';
import { FormMetadata, FormProvider, getFormProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import { Dialog } from '@datum-ui/components/dialog';
import { useImperativeHandle, useRef, useState } from 'react';
import { Form } from 'react-router';

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
  const [defaultValue, setDefaultValue] = useState<SecretVariablesSchema | undefined>({
    variables: [{ key: '', value: '' }],
  });

  const updateSecretMutation = useUpdateSecret(projectId ?? '', secretId ?? '', {
    onSuccess: () => {
      resolveRef.current?.(false);
      setIsOpen(false);
      onSuccess?.();
    },
  });

  const [form, fields] = useForm({
    id: 'secret-variables-form',
    constraint: getZodConstraint(secretVariablesSchema),
    defaultValue: defaultValue,
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: secretVariablesSchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();

      if (submission?.status === 'success') {
        const data = (submission?.value?.variables ?? []).reduce(
          (acc, vars) => {
            acc[vars.key] = isBase64(vars.value) ? vars.value : toBase64(vars.value);
            return acc;
          },
          {} as Record<string, string>
        );
        updateSecretMutation.mutate({ data });
      }
    },
  });

  useImperativeHandle(ref, () => ({
    show: (value?: SecretVariablesSchema) => {
      setIsOpen(true);
      setDefaultValue(value);
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
      });
    },
  }));

  const handleOpenChange = (open: boolean) => {
    // Reset form
    form.reset({ name: fields.variables.name });

    if (!open) {
      resolveRef.current?.(false);
      onCancel?.();
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Content className="w-2xl max-w-3xl!">
        <Dialog.Header
          title="Add Key-Value Pairs"
          description="If not already base64-encoded, values will be encoded automatically."
          onClose={() => handleOpenChange(false)}
        />
        <Dialog.Body className="px-5">
          <FormProvider context={form.context}>
            <Form
              {...getFormProps(form)}
              id={form.id}
              method="POST"
              autoComplete="off"
              className="flex flex-col gap-6">
              <KeysForm
                mode="dialog"
                defaultValue={defaultValue}
                form={form as FormMetadata<SecretVariablesSchema>}
                fields={fields as unknown as ReturnType<typeof useForm<SecretVariablesSchema>>[1]}
              />
            </Form>
          </FormProvider>
        </Dialog.Body>
        <Dialog.Footer>
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
            {updateSecretMutation.isPending ? 'Creating' : 'Create'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
};

KeysFormDialog.displayName = 'KeysFormDialog';
