import { RulesForm } from './rule/rules-form';
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
import { SelectGateways } from '@/features/connect/http-route/select-gateways';
import { useIsPending } from '@/hooks/useIsPending';
import { useApp } from '@/providers/app.provider';
import { IHttpRouteControlResponse } from '@/resources/interfaces/http-route.interface';
import {
  HttpRouteRuleSchema,
  HttpRouteSchema,
  httpRouteSchema,
} from '@/resources/schemas/http-route.schema';
import { MetadataSchema } from '@/resources/schemas/metadata.schema';
import { ROUTE_PATH as HTTP_ROUTES_ACTIONS_PATH } from '@/routes/api/http-routes';
import { convertObjectToLabels } from '@/utils/data';
import {
  FieldMetadata,
  FormProvider,
  getFormProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { useEffect, useMemo, useState } from 'react';
import { Form, useNavigate, useSubmit } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';

export const HttpRouteForm = ({
  projectId,
  defaultValue,
}: {
  projectId?: string;
  defaultValue?: IHttpRouteControlResponse;
}) => {
  const navigate = useNavigate();
  const isPending = useIsPending();
  const submit = useSubmit();
  const { orgId } = useApp();
  const { confirm } = useConfirmationDialog();

  const [formattedValues, setFormattedValues] = useState<HttpRouteSchema>();
  const [form, fields] = useForm({
    id: 'http-route-form',
    constraint: getZodConstraint(httpRouteSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: httpRouteSchema });
    },
  });

  const parentRefsControl = useInputControl(
    fields.parentRefs as unknown as FieldMetadata<string[]>
  );

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined;
  }, [defaultValue]);

  const deleteHttpRoute = async () => {
    await confirm({
      title: 'Delete HTTP Route',
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
      confirmInputPlaceholder: 'Type the http route name to confirm deletion',
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
            fetcherKey: 'http-routes-resources',
            navigate: false,
            action: HTTP_ROUTES_ACTIONS_PATH,
          }
        );
      },
    });
  };

  useEffect(() => {
    if (defaultValue && defaultValue.name) {
      const { name, labels, annotations, parentRefs, ...rest } = defaultValue;
      const metadata = {
        name,
        labels: convertObjectToLabels(labels ?? {}),
        annotations: convertObjectToLabels(annotations ?? {}),
      };

      setFormattedValues({
        ...metadata,
        parentRefs: parentRefs ?? [],
        rules: (rest.rules ?? []) as HttpRouteRuleSchema[],
        resourceVersion: defaultValue.resourceVersion,
      });
    }
  }, [defaultValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create'} HTTP route</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the HTTP route with the new values below.'
            : 'Create a new HTTP route to get started with Datum Cloud.'}
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

          {isEdit && (
            <input type="hidden" name="resourceVersion" value={defaultValue?.resourceVersion} />
          )}

          <CardContent className="space-y-4">
            <MetadataForm
              fields={fields as unknown as ReturnType<typeof useForm<MetadataSchema>>[1]}
              defaultValue={formattedValues as MetadataSchema}
              isEdit={isEdit}
            />

            <Field isRequired label="Gateways" errors={fields.parentRefs.errors}>
              <SelectGateways
                {...getSelectProps(fields.parentRefs, { value: false })}
                projectId={projectId}
                defaultValue={formattedValues?.parentRefs}
                onChange={(value) => parentRefsControl.change(value)}
              />
            </Field>

            <RulesForm
              fields={fields as unknown as ReturnType<typeof useForm<HttpRouteSchema>>[1]}
              defaultValue={formattedValues?.rules}
              projectId={projectId}
            />
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {isEdit ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={deleteHttpRoute}>
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
