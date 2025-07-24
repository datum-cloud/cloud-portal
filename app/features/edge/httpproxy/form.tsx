import { Field } from '@/components/field/field';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { routes } from '@/constants/routes';
import { useIsPending } from '@/hooks/useIsPending';
import { useApp } from '@/providers/app.provider';
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { httpProxySchema } from '@/resources/schemas/http-proxy.schema';
import { ROUTE_PATH as HTTP_PROXIES_ACTIONS_PATH } from '@/routes/api+/edge+/httpproxy+/actions';
import { generateId, generateRandomString } from '@/utils/idGenerator';
import { getPathWithParams } from '@/utils/path';
import {
  FormProvider,
  getFormProps,
  getInputProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { useEffect, useMemo, useRef } from 'react';
import { Form, useNavigate, useSubmit } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const HttpProxyForm = ({
  projectId,
  defaultValue,
}: {
  projectId?: string;
  defaultValue?: IHttpProxyControlResponse;
}) => {
  const { orgId } = useApp();
  const isHydrated = useHydrated();
  const isPending = useIsPending();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();
  const submit = useSubmit();

  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Generates a resource name from an endpoint URL
   * Handles both domain names and IP addresses
   */
  const generateNameFromEndpoint = (endpoint: string, randomSuffix: string): string => {
    try {
      // Add protocol if missing to make URL parsing work
      const urlString = endpoint.includes('://') ? endpoint : `http://${endpoint}`;
      const hostname = new URL(urlString).hostname;

      // Check if the hostname is an IP address
      const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);

      if (isIpAddress) {
        // For IP addresses, use "ip-" prefix and replace dots with dashes
        const ipFormatted = `ip-${hostname}`;
        return generateId(ipFormatted, { randomText: randomSuffix });
      } else {
        // For regular domains
        return generateId(hostname, { randomText: randomSuffix });
      }
    } catch {
      // Fallback if URL parsing fails
      return generateId(endpoint, { randomText: randomSuffix });
    }
  };

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
        await submit(
          {
            id: defaultValue?.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            action: HTTP_PROXIES_ACTIONS_PATH,
            method: 'DELETE',
            fetcherKey: 'http-proxy-resources',
            navigate: false,
          }
        );
      },
    });
  };

  const [form, fields] = useForm({
    id: 'http-proxy-form',
    constraint: getZodConstraint(httpProxySchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: httpProxySchema });
    },
  });

  const nameControl = useInputControl(fields.name);
  const endpointControl = useInputControl(fields.endpoint);
  const randomSuffix = useMemo(() => generateRandomString(6), []);

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
            <Field
              isRequired
              label="Backend Endpoint"
              description="Enter the URL or hostname where your service is running"
              errors={fields.endpoint.errors}>
              <Input
                {...getInputProps(fields.endpoint, { type: 'text' })}
                ref={inputRef}
                key={fields.endpoint.id}
                placeholder="e.g. https://api.example.com or api.example.com"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = (e.target as HTMLInputElement).value;
                  if (value && !isEdit) {
                    nameControl.change(generateNameFromEndpoint(value, randomSuffix));
                  }
                }}
              />
            </Field>
            <Field
              isRequired
              label="Proxy Name"
              description="This name will be used to identify your HTTPProxy resource"
              errors={fields.name.errors}>
              <Input
                {...getInputProps(fields.name, { type: 'text' })}
                readOnly={isEdit}
                key={fields.name.id}
                placeholder="e.g. api-example-com-3sd122"
              />
            </Field>
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {isEdit ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={deleteHttpProxy}>
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
                  navigate(
                    getPathWithParams(routes.projects.internetEdge.httpProxy.root, {
                      projectId,
                      orgId,
                    })
                  );
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
