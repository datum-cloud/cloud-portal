import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { Field } from '@/components/field/field';
import { useIsPending } from '@/hooks/useIsPending';
import type { CreateDnsZoneInput, DnsZone } from '@/resources/dns-zones';
import { createDnsZoneSchema, useDeleteDnsZone } from '@/resources/dns-zones';
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
import { Form, useNavigate, useSearchParams } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const DnsZoneForm = ({
  projectId,
  defaultValue,
  onSubmit,
  isSubmitting = false,
}: {
  projectId: string;
  defaultValue?: DnsZone;
  onSubmit?: (data: CreateDnsZoneInput) => void;
  isSubmitting?: boolean;
}) => {
  const isHydrated = useHydrated();
  const isNavigationPending = useIsPending();
  const inputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const deleteDnsZoneMutation = useDeleteDnsZone(projectId, {
    onSuccess: () => {
      navigate(getPathWithParams(paths.project.detail.dnsZones.root, { projectId }));
    },
  });

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
      confirmValue: defaultValue?.domainName,
      confirmInputLabel: `Type "${defaultValue?.domainName}" to confirm.`,
      onSubmit: async () => {
        if (defaultValue?.name) {
          await deleteDnsZoneMutation.mutateAsync(defaultValue.name);
        }
      },
    });
  };

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined;
  }, [defaultValue]);

  // Use mutation pending state for create mode, navigation pending for edit mode
  const isPending = isEdit ? isNavigationPending : isSubmitting;

  const [form, fields] = useForm({
    defaultValue: {
      domainName: searchParams.get('domainName') ?? '',
    },
    id: 'dns-zone-form',
    constraint: getZodConstraint(createDnsZoneSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createDnsZoneSchema });
    },
    onSubmit(event, { submission }) {
      // If onSubmit callback is provided and form is valid, handle submission via mutation
      if (onSubmit && submission?.status === 'success') {
        event.preventDefault();
        onSubmit(submission.value as CreateDnsZoneInput);
      }
      // Otherwise, let the form submit normally (edit mode uses action)
    },
  });

  const domainNameControl = useInputControl(fields.domainName);
  const descriptionControl = useInputControl(fields.description);

  useEffect(() => {
    if (!isHydrated) return;

    const domainName = searchParams.get('domainName');
    if (domainName && !isEdit) {
      // If domain is in searchParams, focus description input
      descriptionInputRef.current?.focus();
    } else if (!isEdit) {
      // Otherwise, focus domain name input (create mode)
      inputRef.current?.focus();
    } else {
      // Edit mode: focus description input
      descriptionInputRef.current?.focus();
    }
  }, [isHydrated, searchParams, isEdit]);

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
          className="mt-6 flex flex-col gap-10">
          <AuthenticityTokenInput />
          <CardContent className="space-y-10">
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
                ref={descriptionInputRef}
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
