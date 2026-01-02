import { SecretMetadataForm } from '../metadata-form';
import { ISecretControlResponse, useUpdateSecret } from '@/resources/secrets';
import { SecretBaseSchema, SecretEditSchema, secretEditSchema } from '@/resources/secrets';
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
import { useMemo } from 'react';
import { useNavigate, Form } from 'react-router';

export const EditSecretMetadata = ({
  projectId,
  defaultValue,
}: {
  projectId: string;
  defaultValue?: ISecretControlResponse;
}) => {
  const navigate = useNavigate();

  const updateSecretMutation = useUpdateSecret(projectId, defaultValue?.name ?? '', {
    onSuccess: () => {
      navigate(-1);
      toast.success('Secret metadata updated successfully', {
        description: 'You have successfully updated the secret metadata.',
      });
    },
    onError: (error) => {
      toast.error('Error', {
        description: error.message ?? 'An error occurred while updating the secret metadata',
      });
    },
  });

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

      updateSecretMutation.mutate({
        metadata: {
          labels: generateMergePatchPayloadMap(originalLabels, newLabels),
          annotations: generateMergePatchPayloadMap(originalAnnotations, newAnnotations),
        },
      });
    },
  });

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
          className="mt-6 flex flex-col gap-10">
          <CardContent className="space-y-10">
            <SecretMetadataForm
              fields={fields as unknown as ReturnType<typeof useForm<SecretBaseSchema>>[1]}
              defaultValue={formattedValues as SecretBaseSchema}
              isEdit={true}
            />
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Button
              htmlType="submit"
              disabled={updateSecretMutation.isPending}
              loading={updateSecretMutation.isPending}>
              {updateSecretMutation.isPending ? 'Saving' : 'Save'}
            </Button>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
