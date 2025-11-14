import { SecretMetadataForm } from '../metadata-form';
import { useIsPending } from '@/hooks/useIsPending';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import {
  SecretBaseSchema,
  SecretEditSchema,
  secretEditSchema,
} from '@/resources/schemas/secret.schema';
import { ROUTE_PATH as SECRET_ACTIONS_ROUTE_PATH } from '@/routes/api/secrets';
import {
  convertLabelsToObject,
  convertObjectToLabels,
  generateMergePatchPayloadMap,
} from '@/utils/helpers/object.helper';
import { FormProvider, getFormProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button, toast } from '@datum-ui/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-ui/components';
import { useEffect, useMemo } from 'react';
import { useNavigate, Form, useFetcher } from 'react-router';
import { AuthenticityTokenInput, useAuthenticityToken } from 'remix-utils/csrf/react';

export const EditSecretMetadata = ({
  projectId,
  defaultValue,
}: {
  projectId: string;
  defaultValue?: ISecretControlResponse;
}) => {
  const fetcher = useFetcher({ key: 'edit-secret-metadata' });
  const navigate = useNavigate();
  const isPending = useIsPending({ fetcherKey: 'edit-secret-metadata' });
  const csrf = useAuthenticityToken();

  const [form, fields] = useForm({
    id: 'edit-secret-form',
    constraint: getZodConstraint(secretEditSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: secretEditSchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();

      if (submission?.status !== 'success') return;

      const { annotations = [], labels = [] } = submission.value as SecretEditSchema;

      const originalAnnotations = defaultValue?.annotations ?? {};
      const originalLabels = defaultValue?.labels ?? {};

      const newAnnotations = convertLabelsToObject(annotations);
      const newLabels = convertLabelsToObject(labels);

      fetcher.submit(
        {
          projectId,
          secretId: defaultValue?.name ?? '',
          action: 'metadata',
          annotations: convertObjectToLabels(
            generateMergePatchPayloadMap(originalAnnotations, newAnnotations)
          ),
          labels: convertObjectToLabels(generateMergePatchPayloadMap(originalLabels, newLabels)),
          csrf,
        },
        {
          method: 'PATCH',
          action: SECRET_ACTIONS_ROUTE_PATH,
          encType: 'application/json',
        }
      );
    },
  });

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success } = fetcher.data;

      if (success) {
        navigate(-1);
        toast.success('Secret metadata updated successfully', {
          description: 'You have successfully updated the secret metadata.',
        });
      } else {
        toast.error('Error', {
          description: fetcher.data.error ?? 'An error occurred while updating the secret metadata',
        });
      }
    }
  }, [fetcher.data, fetcher.state]);

  const formattedValues = useMemo(() => {
    if (!defaultValue) return {};

    return {
      ...defaultValue,
      labels: convertObjectToLabels(defaultValue?.labels ?? {}),
      annotations: convertObjectToLabels(defaultValue?.annotations ?? {}),
    };
  }, [defaultValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Metadata</CardTitle>
        <CardDescription>View the metadata information for this secret.</CardDescription>
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
              defaultValue={formattedValues as SecretBaseSchema}
              isEdit={true}
            />
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            {/* <Button
              type="button"
              variant="link"
              disabled={isPending}
              onClick={() => {
                navigate(-1)
              }}>
              Return to List
            </Button> */}
            <Button htmlType="submit" disabled={isPending} loading={isPending}>
              {isPending ? 'Saving' : 'Save'}
            </Button>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
