import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
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
import { paths } from '@/config/paths';
import { useIsPending } from '@/hooks/useIsPending';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { domainSchema } from '@/resources/schemas/domain.schema';
import { ROUTE_PATH as DOMAINS_ACTIONS_PATH } from '@/routes/api/domains';
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
import { Form, useFetcher } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const DomainForm = ({
  projectId,
  defaultValue,
}: {
  projectId?: string;
  defaultValue?: IDomainControlResponse;
}) => {
  const isHydrated = useHydrated();
  const isPending = useIsPending();
  const { confirm } = useConfirmationDialog();
  const fetcher = useFetcher({ key: 'delete-domain' });

  const inputRef = useRef<HTMLInputElement>(null);

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined;
  }, [defaultValue]);

  const deleteDomain = async () => {
    await confirm({
      title: 'Delete Domain',
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
            redirectUri: getPathWithParams(paths.project.detail.domains.root, {
              projectId,
            }),
          },
          {
            action: DOMAINS_ACTIONS_PATH,
            method: 'DELETE',
          }
        );
      },
    });
  };

  const [form, fields] = useForm({
    id: 'domain-form',
    constraint: getZodConstraint(domainSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: domainSchema });
    },
  });

  const nameControl = useInputControl(fields.name);
  const domainControl = useInputControl(fields.domain);

  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  useEffect(() => {
    if (defaultValue && defaultValue.domainName) {
      nameControl.change(defaultValue.name);
      domainControl.change(defaultValue.domainName);
    }
  }, [defaultValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Domain' : 'Create a new Domain'}</CardTitle>
        <CardDescription>
          To use a custom domain for your services, you must first verify ownership. This form
          creates a Domain resource that provides the necessary DNS records for verification. Once
          verified, you can securely use your domain in HTTPProxies and Gateways.
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
              label="Name"
              description="This name will be used to identify your Domain resource"
              errors={fields.name.errors}>
              <Input
                {...getInputProps(fields.name, { type: 'text' })}
                readOnly={isEdit}
                ref={isEdit ? undefined : inputRef}
                key={fields.name.id}
                placeholder="e.g. example-com-3sd122"
              />
            </Field>
            <Field
              isRequired
              label="Domain"
              description="Enter the domain where your service is running"
              errors={fields.domain.errors}>
              <Input
                {...getInputProps(fields.domain, { type: 'text' })}
                key={fields.domain.id}
                ref={isEdit ? inputRef : undefined}
                placeholder="e.g. example.com"
              />
            </Field>
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {isEdit ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={deleteDomain}>
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex justify-end gap-2">
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
