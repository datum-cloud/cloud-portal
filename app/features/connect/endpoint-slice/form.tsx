import { EndpointsForm } from './endpoint/endpoints-form';
import { PortsForm } from './port/ports-form';
import { SelectAddressType } from './select-address-type';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { Field } from '@/components/field/field';
import { MetadataForm } from '@/components/metadata/metadata-form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useIsPending } from '@/hooks/useIsPending';
import { useApp } from '@/providers/app.provider';
import {
  EndpointSliceAddressType,
  IEndpointSliceControlResponse,
} from '@/resources/interfaces/endpoint-slice.interface';
import {
  EndpointSliceSchema,
  endpointSliceSchema,
} from '@/resources/schemas/endpoint-slice.schema';
import { MetadataSchema } from '@/resources/schemas/metadata.schema';
import { ROUTE_PATH as ENDPOINT_SLICES_ACTIONS_PATH } from '@/routes/api/endpoint-slices';
import { convertObjectToLabels } from '@/utils/data';
import { FormProvider, getFormProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { useEffect, useMemo, useState } from 'react';
import { Form, useNavigate, useSubmit } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';

export const EndpointSliceForm = ({
  projectId,
  defaultValue,
}: {
  projectId?: string;
  defaultValue?: IEndpointSliceControlResponse;
}) => {
  const navigate = useNavigate();
  const isPending = useIsPending();
  const submit = useSubmit();
  const { orgId } = useApp();
  const { confirm } = useConfirmationDialog();

  const [formattedValues, setFormattedValues] = useState<EndpointSliceSchema>();
  const [form, fields] = useForm({
    id: 'endpoint-slice-form',
    constraint: getZodConstraint(endpointSliceSchema),
    defaultValue: {
      addressType: EndpointSliceAddressType.FQDN,
    },
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: endpointSliceSchema });
    },
  });

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined;
  }, [defaultValue]);

  const deleteEndpointSlice = async () => {
    await confirm({
      title: 'Delete Endpoint Slice',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{defaultValue?.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${defaultValue?.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the endpoint slice name to confirm deletion',
      confirmValue: defaultValue?.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            id: defaultValue?.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'endpoint-slices-resources',
            navigate: false,
            action: ENDPOINT_SLICES_ACTIONS_PATH,
          }
        );
      },
    });
  };

  useEffect(() => {
    if (defaultValue && defaultValue.name) {
      const metadata = {
        name: defaultValue.name,
        labels: convertObjectToLabels(defaultValue.labels ?? {}),
        annotations: convertObjectToLabels(defaultValue.annotations ?? {}),
      };

      setFormattedValues({
        ...metadata,
        addressType: defaultValue?.addressType ?? EndpointSliceAddressType.FQDN,
        endpoints: defaultValue?.endpoints ?? [],
        ports: defaultValue?.ports ?? [],
      });
    }
  }, [defaultValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new Endpoint Slice</CardTitle>
        <CardDescription>
          Create a new Endpoint Slice to get started with Datum Cloud.
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
            <MetadataForm
              fields={fields as unknown as ReturnType<typeof useForm<MetadataSchema>>[1]}
              defaultValue={formattedValues as MetadataSchema}
              isEdit={isEdit}
            />
            <Field
              isRequired
              label="Address Type"
              errors={fields.addressType.errors}
              className="w-1/4">
              <SelectAddressType meta={fields.addressType} />
            </Field>
            <EndpointsForm
              fields={fields as unknown as ReturnType<typeof useForm<EndpointSliceSchema>>[1]}
              defaultValue={formattedValues?.endpoints}
            />
            <PortsForm
              fields={fields as unknown as ReturnType<typeof useForm<EndpointSliceSchema>>[1]}
              defaultValue={formattedValues?.ports}
            />
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {isEdit ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={deleteEndpointSlice}>
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="link"
                disabled={isPending}
                onClick={() => {
                  navigate(-1);
                }}>
                Return to List
              </Button>
              <Button variant="default" type="submit" disabled={isPending} isLoading={isPending}>
                {isPending ? `${isEdit ? 'Saving' : 'Creating'}` : `${isEdit ? 'Save' : 'Create'}`}
              </Button>
            </div>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
