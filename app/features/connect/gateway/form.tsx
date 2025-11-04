import { ListenersForm } from './listener/listeners-form';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { MetadataForm } from '@/components/metadata/metadata-form';
import { useIsPending } from '@/hooks/useIsPending';
import { useApp } from '@/providers/app.provider';
import {
  GatewayProtocol,
  GatewayAllowedRoutes,
  GatewayTlsMode,
  IGatewayControlResponse,
} from '@/resources/interfaces/gateway.interface';
import {
  GatewayListenerFieldSchema,
  GatewayListenerSchema,
  GatewaySchema,
  gatewaySchema,
} from '@/resources/schemas/gateway.schema';
import { MetadataSchema } from '@/resources/schemas/metadata.schema';
import { ROUTE_PATH as GATEWAYS_ACTIONS_PATH } from '@/routes/api/gateways';
import { convertObjectToLabels } from '@/utils/helpers/object.helper';
import { FormProvider, getFormProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@shadcn/ui/card';
import { get } from 'es-toolkit/compat';
import { useEffect, useMemo, useState } from 'react';
import { Form, useNavigate, useSubmit } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';

export const GatewayForm = ({
  defaultValue,
  projectId,
}: {
  defaultValue?: IGatewayControlResponse;
  projectId?: string;
}) => {
  const navigate = useNavigate();
  const isPending = useIsPending();
  const submit = useSubmit();
  const { orgId } = useApp();
  const { confirm } = useConfirmationDialog();

  const deleteGateway = async () => {
    await confirm({
      title: 'Delete Gateway',
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
      confirmInputPlaceholder: 'Type the gateway name to confirm deletion',
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
            fetcherKey: 'gateway-resources',
            navigate: false,
            action: GATEWAYS_ACTIONS_PATH,
          }
        );
      },
    });
  };

  const [formattedValues, setFormattedValues] = useState<GatewaySchema>();
  const [form, fields] = useForm({
    id: 'gateway-form',
    constraint: getZodConstraint(gatewaySchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: gatewaySchema });
    },
  });

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined;
  }, [defaultValue]);

  useEffect(() => {
    if (defaultValue && defaultValue.name) {
      const metadata = {
        name: defaultValue.name,
        labels: convertObjectToLabels(defaultValue.labels ?? {}),
        annotations: convertObjectToLabels(defaultValue.annotations ?? {}),
      };

      const listeners: GatewayListenerFieldSchema[] = (defaultValue?.listeners ?? []).map(
        (listener) => {
          const from = get(listener, 'allowedRoutes.namespaces.from', GatewayAllowedRoutes.SAME);
          /* const matchLabels = get(
            listener,
            'allowedRoutes.namespaces.selector.matchLabels',
            {},
          ) */

          const tls =
            listener.protocol === GatewayProtocol.HTTPS
              ? {
                  mode: get(listener, 'tlsConfiguration.mode', GatewayTlsMode.TERMINATE),
                }
              : undefined;

          return {
            name: listener.name ?? '',
            port: listener.port ?? 80,
            protocol: listener.protocol ?? '',
            allowedRoutes: from,
            // matchLabels: from === 'Selector' ? convertObjectToLabels(matchLabels) : [],
            tlsConfiguration: tls,
          };
        }
      );

      setFormattedValues({
        ...metadata,
        listeners,
      });
    }
  }, [defaultValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} gateway</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the gateway with the new values below.'
            : 'Create a new gateway to get started with Datum Cloud.'}
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
            <ListenersForm
              fields={fields as unknown as ReturnType<typeof useForm<GatewayListenerSchema>>[1]}
              defaultValue={{ listeners: formattedValues?.listeners ?? [] }}
            />
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {isEdit ? (
              <Button
                type="danger"
                theme="solid"
                onClick={() => deleteGateway()}
                disabled={isPending}>
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="quaternary"
                theme="borderless"
                disabled={isPending}
                onClick={() => {
                  navigate(-1);
                }}>
                Return to List
              </Button>
              <Button htmlType="submit" disabled={isPending} loading={isPending}>
                {isPending ? `${isEdit ? 'Saving' : 'Creating'}` : `${isEdit ? 'Save' : 'Create'}`}
              </Button>
            </div>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
