import { KeysForm } from './keys/keys-form';
import { SecretMetadataForm } from './metadata-form';
import { useIsPending } from '@/hooks/useIsPending';
import { Button } from '@/modules/datum-ui/components/button.tsx';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import {
  SecretBaseSchema,
  SecretVariablesSchema,
  secretNewSchema,
} from '@/resources/schemas/secret.schema';
import { FormMetadata, FormProvider, getFormProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@shadcn/ui/card';
import { useMemo } from 'react';
import { Form } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';

export const SecretForm = ({ defaultValue }: { defaultValue?: ISecretControlResponse }) => {
  const isPending = useIsPending();

  const [form, fields] = useForm({
    id: 'secret-form',
    constraint: getZodConstraint(secretNewSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: secretNewSchema });
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
        <Form
          {...getFormProps(form)}
          id={form.id}
          method="POST"
          autoComplete="off"
          className="flex flex-col gap-6">
          <AuthenticityTokenInput />
          <CardContent className="space-y-4">
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
            <Button variant="default" type="submit" disabled={isPending} isLoading={isPending}>
              {isPending ? `${isEdit ? 'Saving' : 'Creating'}` : `${isEdit ? 'Save' : 'Create'}`}
            </Button>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
