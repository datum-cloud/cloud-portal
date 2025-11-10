import { Field } from '@/components/field/field';
import { useIsPending } from '@/hooks/useIsPending';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns-zone.interface';
import { formDnsZoneSchema } from '@/resources/schemas/dns-zone.schema';
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
} from '@shadcn/ui/card';
import { Input } from '@shadcn/ui/input';
import { useEffect, useMemo, useRef } from 'react';
import { Form } from 'react-router';
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
    defaultValue: {
      domainName: undefined,
    },
  });

  const domainNameControl = useInputControl(fields.domainName);

  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  useEffect(() => {
    if (defaultValue && defaultValue.domainName) {
      domainNameControl.change(defaultValue.domainName);
    }
  }, [defaultValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit DNS Zone' : 'Create a new DNS Zone'}</CardTitle>
        <CardDescription>
          Create a new zone to get started with Datum’s advanced DNS features
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
                key={fields.domainName.id}
                ref={inputRef}
                placeholder="e.g. example.com"
              />
            </Field>

            <Field label="Description" errors={fields.description.errors}>
              <Input
                {...getInputProps(fields.description, { type: 'text' })}
                key={fields.description.id}
                placeholder="e.g. Our main marketing site"
              />
            </Field>
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {isEdit ? (
              <Button type="danger" theme="solid" disabled={isPending}>
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
