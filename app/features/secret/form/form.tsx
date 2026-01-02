import { KeysForm } from './keys/keys-form';
import { SecretMetadataForm } from './metadata-form';
import { ISecretControlResponse, type SecretNewSchema } from '@/resources/secrets';
import { SecretBaseSchema, SecretVariablesSchema, secretNewSchema } from '@/resources/secrets';
import { FormMetadata, FormProvider, getFormProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-ui/components';
import { useMemo } from 'react';

interface SecretFormProps {
  defaultValue?: ISecretControlResponse;
  onSubmit: (data: SecretNewSchema) => void;
  isPending?: boolean;
}

export const SecretForm = ({ defaultValue, onSubmit, isPending = false }: SecretFormProps) => {
  const [form, fields] = useForm({
    id: 'secret-form',
    constraint: getZodConstraint(secretNewSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: secretNewSchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      if (submission?.status === 'success') {
        onSubmit(submission.value as SecretNewSchema);
      }
    },
  });

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined;
  }, [defaultValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} Secret</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the secret with the new values below.'
            : 'Create a new secret to get started with Datum Cloud.'}
        </CardDescription>
      </CardHeader>
      <FormProvider context={form.context}>
        <form
          {...getFormProps(form)}
          id={form.id}
          autoComplete="off"
          className="mt-6 flex flex-col gap-10">
          <CardContent className="space-y-10">
            <SecretMetadataForm
              fields={fields as unknown as ReturnType<typeof useForm<SecretBaseSchema>>[1]}
              defaultValue={defaultValue as SecretBaseSchema}
              isEdit={isEdit}
            />
            <KeysForm
              form={form as FormMetadata<SecretVariablesSchema>}
              fields={fields as unknown as ReturnType<typeof useForm<SecretVariablesSchema>>[1]}
            />
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Button htmlType="submit" disabled={isPending} loading={isPending}>
              {isPending ? `${isEdit ? 'Saving' : 'Creating'}` : `${isEdit ? 'Save' : 'Create'}`}
            </Button>
          </CardFooter>
        </form>
      </FormProvider>
    </Card>
  );
};
