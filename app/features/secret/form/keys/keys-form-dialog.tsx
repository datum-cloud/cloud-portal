import { KeysForm } from './keys-form';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useIsPending } from '@/hooks/useIsPending';
import { SecretVariablesSchema, secretVariablesSchema } from '@/resources/schemas/secret.schema';
import { ROUTE_PATH as SECRET_ACTIONS_ROUTE_PATH } from '@/routes/api/secrets';
import { isBase64, toBase64 } from '@/utils/text';
import { FormMetadata, FormProvider, getFormProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Form, useFetcher } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

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
  const fetcher = useFetcher({ key: 'add-secret-variables' });
  const isPending = useIsPending({ fetcherKey: 'add-secret-variables' });
  const csrf = useAuthenticityToken();

  const [isOpen, setIsOpen] = useState(false);
  const resolveRef = useRef<(value: boolean) => void>(null);
  const [defaultValue, setDefaultValue] = useState<SecretVariablesSchema | undefined>({
    variables: [{ key: '', value: '' }],
  });

  const [form, fields] = useForm({
    id: 'secret-variables-form',
    constraint: getZodConstraint(secretVariablesSchema),
    defaultValue: defaultValue,
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: secretVariablesSchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();

      if (submission?.status === 'success') {
        fetcher.submit(
          {
            projectId: projectId ?? '',
            secretId: secretId ?? '',
            data: (submission?.value?.variables ?? []).reduce(
              (acc, vars) => {
                acc[vars.key] = isBase64(vars.value) ? vars.value : toBase64(vars.value);
                return acc;
              },
              {} as Record<string, string>
            ),
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

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success } = fetcher.data;

      if (success) {
        handleOpenChange(false);
        onSuccess?.();
      }
    }
  }, [fetcher.data, fetcher.state]);

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
      <DialogContent className="w-2xl !max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Key-Value Pairs</DialogTitle>
          <DialogDescription>
            If not already base64-encoded, values will be encoded automatically.
          </DialogDescription>
        </DialogHeader>
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
            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="link"
                disabled={isPending}
                onClick={() => {
                  handleOpenChange(false);
                }}>
                Cancel
              </Button>
              <Button variant="default" type="submit" disabled={isPending} isLoading={isPending}>
                {isPending ? 'Creating' : 'Create'}
              </Button>
            </DialogFooter>
          </Form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

KeysFormDialog.displayName = 'KeysFormDialog';
