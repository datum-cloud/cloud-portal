import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { Field } from '@/components/field/field';
import { InputName } from '@/components/input-name/input-name';
import { HostnamesForm } from '@/features/edge/proxy/form/hostnames-form';
import {
  IHttpProxyControlResponse,
  httpProxySchema,
  useDeleteHttpProxy,
  type HttpProxySchema,
} from '@/resources/http-proxies';
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
import { Button, toast } from '@datum-ui/components';
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
import { useNavigate } from 'react-router';
import { useHydrated } from 'remix-utils/use-hydrated';

export const HttpProxyForm = ({
  projectId,
  defaultValue,
  onSubmit,
  isPending = false,
}: {
  projectId?: string;
  defaultValue?: IHttpProxyControlResponse;
  onSubmit?: (data: HttpProxySchema) => void;
  isPending?: boolean;
}) => {
  const isHydrated = useHydrated();
  const { confirm } = useConfirmationDialog();
  const navigate = useNavigate();

  const inputRef = useRef<HTMLInputElement>(null);

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined;
  }, [defaultValue]);

  const deleteMutation = useDeleteHttpProxy(projectId ?? '', {
    onSuccess: () => {
      toast.success('Proxy deleted successfully', {
        description: 'The proxy has been deleted successfully',
      });
      navigate(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete proxy');
    },
  });

  const deleteHttpProxy = async () => {
    await confirm({
      title: 'Delete Proxy',
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
      confirmValue: defaultValue?.name,
      confirmInputLabel: `Type "${defaultValue?.name}" to confirm.`,
      onSubmit: async () => {
        await deleteMutation.mutateAsync(defaultValue?.name ?? '');
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
    onSubmit(event, { submission }) {
      event.preventDefault();
      if (submission?.status === 'success' && onSubmit) {
        onSubmit(submission.value);
      }
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
        <CardTitle>{isEdit ? 'Edit Proxy' : 'Create a new Proxy'}</CardTitle>
        <CardDescription>
          {`${isEdit ? 'Edit' : 'Create'} an Proxy to expose your service on a custom domain — with automatic HTTPS, smart routing, and zero hassle. Just tell us your backend endpoint, and we'll handle the rest.`}
        </CardDescription>
      </CardHeader>
      <FormProvider context={form.context}>
        <form
          {...getFormProps(form)}
          id={form.id}
          autoComplete="off"
          className="mt-6 flex flex-col gap-10">
          <CardContent className="space-y-10">
            <InputName
              description="This unique resource name will be used to identify your Proxy resource and cannot be changed."
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
              <Button
                type="danger"
                theme="solid"
                disabled={isPending || deleteMutation.isPending}
                loading={deleteMutation.isPending}
                onClick={deleteHttpProxy}>
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
        </form>
      </FormProvider>
    </Card>
  );
};
