import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { Field } from '@/components/field/field';
import { useIsPending } from '@/hooks/useIsPending';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { formDnsZoneSchema } from '@/resources/schemas/dns-zone.schema';
import { ROUTE_PATH as DNS_ZONES_ACTIONS_PATH } from '@/routes/api/dns-zones';
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

export const DnsZoneForm = ({
  projectId,
  defaultValue,
}: {
  projectId: string;
  defaultValue?: IDnsZoneControlResponse;
}) => {
  const isHydrated = useHydrated();
  const isPending = useIsPending();
  const inputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher({ key: 'delete-dns-zone' });

  const { confirm } = useConfirmationDialog();
  const deleteDnsZone = async () => {
    await confirm({
      title: 'Delete DNS Zone',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{defaultValue?.domainName}</strong>?
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
            redirectUri: getPathWithParams(paths.project.detail.dnsZones.root, {
              projectId,
            }),
          },
          {
            method: 'DELETE',
            action: DNS_ZONES_ACTIONS_PATH,
          }
        );
      },
    });
  };

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined;
  }, [defaultValue]);

  const [form, fields] = useForm({
    id: 'dns-zone-form',
    constraint: getZodConstraint(formDnsZoneSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: formDnsZoneSchema });
    },
  });

  const domainNameControl = useInputControl(fields.domainName);
  const descriptionControl = useInputControl(fields.description);

  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  useEffect(() => {
    if (defaultValue && defaultValue.domainName) {
      domainNameControl.change(defaultValue.domainName);
      descriptionControl.change(defaultValue.description ?? '');
    }
  }, [defaultValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit DNS Zone' : 'Add a DNS Zone'}</CardTitle>
        <CardDescription>
          Create a new zone to get started with Datum&apos;s advanced DNS features
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
              label="Zone Name"
              description="Should be a valid domain or subdomain"
              errors={fields.domainName.errors}>
              <Input
                {...getInputProps(fields.domainName, { type: 'text' })}
                readOnly={isEdit}
                key={fields.domainName.id}
                ref={isEdit ? undefined : inputRef}
                placeholder="e.g. example.com"
              />
            </Field>

            <Field label="Description" errors={fields.description.errors}>
              <Input
                {...getInputProps(fields.description, { type: 'text' })}
                key={fields.description.id}
                placeholder="e.g. Our main marketing site"
                ref={isEdit ? inputRef : undefined}
              />
            </Field>
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {isEdit ? (
              <Button type="danger" theme="solid" disabled={isPending} onClick={deleteDnsZone}>
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
