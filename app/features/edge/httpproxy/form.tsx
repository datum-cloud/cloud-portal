import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { Field } from '@/components/field/field';
import { InputName } from '@/components/input-name/input-name';
import { HostnamesForm } from '@/features/edge/httpproxy/form/hostnames-form';
import { useIsPending } from '@/hooks/useIsPending';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { httpProxySchema } from '@/resources/schemas/http-proxy.schema';
import { ROUTE_PATH as HTTP_PROXIES_ACTIONS_PATH } from '@/routes/api/httpproxy';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import {
  FormProvider,
  getFormProps,
  getInputProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
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
import { Input } from '@datum-ui/components';
import { useEffect, useMemo, useRef } from 'react';
import { Form, useFetcher } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const HttpProxyForm = ({
  projectId,
  defaultValue,
}: {
  projectId?: string;
  defaultValue?: IHttpProxyControlResponse;
}) => {
  const isHydrated = useHydrated();
  const isPending = useIsPending();
  const { confirm } = useConfirmationDialog();
  const fetcher = useFetcher({ key: 'delete-httpproxy' });

  const inputRef = useRef<HTMLInputElement>(null);

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined;
  }, [defaultValue]);

  const deleteHttpProxy = async () => {
    await confirm({
      title: 'Delete HTTPProxy',
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
      onSubmit: async () => {
        await fetcher.submit(
          {
            id: defaultValue?.name ?? '',
            projectId: projectId ?? '',
            redirectUri: getPathWithParams(paths.project.detail.httpProxy.root, {
              projectId,
            }),
          },
          {
            action: HTTP_PROXIES_ACTIONS_PATH,
            method: 'DELETE',
          }
        );
      },
    });
  };

  const [form, fields] = useForm({
    id: 'http-proxy-form',
    constraint: getZodConstraint(httpProxySchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: httpProxySchema });
    },
  });

  const nameControl = useInputControl(fields.name);
  const endpointControl = useInputControl(fields.endpoint);

  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  useEffect(() => {
    if (defaultValue && defaultValue.endpoint) {
      nameControl.change(defaultValue.name);
      endpointControl.change(defaultValue.endpoint);
    }
  }, [defaultValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit HTTPProxy' : 'Create a new HTTPProxy'}</CardTitle>
        <CardDescription>
          {`${isEdit ? 'Edit' : 'Create'} an HTTPProxy to expose your service on a custom domain — with automatic HTTPS, smart routing, and zero hassle. Just tell us your backend endpoint, and we'll handle the rest.`}
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
            <InputName
              description="This unique resource name will be used to identify your HTTPProxy resource and cannot be changed."
              readOnly={isEdit}
              required={true}
              field={fields.name}
              autoGenerate={false}
              inputRef={isEdit ? undefined : inputRef}
            />
            <Field
              isRequired
              label="Backend Endpoint"
              description="Enter the URL or hostname where your service is running"
              errors={fields.endpoint.errors}>
              <Input
                {...getInputProps(fields.endpoint, { type: 'text' })}
                key={fields.endpoint.id}
                ref={isEdit ? inputRef : undefined}
                placeholder="e.g. https://api.example.com or api.example.com"
              />
            </Field>
            <HostnamesForm defaultValue={defaultValue?.hostnames} form={form} fields={fields} />
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {isEdit ? (
              <Button type="danger" theme="solid" disabled={isPending} onClick={deleteHttpProxy}>
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex justify-end gap-2">
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
