import { Field } from '@/components/field/field';
import type { DnsZone } from '@/resources/dns-zones';
import { createDnsZoneSchema, useUpdateDnsZone } from '@/resources/dns-zones';
import {
  FormProvider,
  getFormProps,
  getInputProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  toast,
} from '@datum-ui/components';
import { Input } from '@datum-ui/components';
import { useEffect, useRef } from 'react';
import { Form } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const DescriptionFormCard = ({
  projectId,
  defaultValue,
}: {
  projectId: string;
  defaultValue: DnsZone;
}) => {
  const isHydrated = useHydrated();
  const inputRef = useRef<HTMLInputElement>(null);

  const updateDnsZoneMutation = useUpdateDnsZone(projectId, defaultValue?.name ?? '', {
    onSuccess: () => {
      toast.success('DNS Zone description updated successfully', {
        description: 'You have successfully updated the DNS Zone description.',
      });
    },
    onError: (error: Error) => {
      toast.error('Error', {
        description: error.message ?? 'An error occurred while updating the DNS Zone description',
      });
    },
  });

  const isPending = updateDnsZoneMutation.isPending;

  const [form, fields] = useForm({
    id: 'description-form',
    constraint: getZodConstraint(createDnsZoneSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createDnsZoneSchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();

      if (submission?.status !== 'success') return;

      updateDnsZoneMutation.mutate({
        description: submission.value.description ?? '',
        resourceVersion: defaultValue.resourceVersion,
      });
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
    <Card className="rounded-xl pt-5 pb-4 shadow-none">
      <CardHeader>
        <CardDescription className="text-xs">
          This description is for your own reference and won&apos;t be shared externally
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
            <Field className="hidden" errors={fields.domainName.errors}>
              <Input
                {...getInputProps(fields.domainName, { type: 'text' })}
                key={fields.domainName.id}
                placeholder="e.g. example.com"
              />
            </Field>

            <Field errors={fields.description.errors}>
              <Input
                {...getInputProps(fields.description, { type: 'text' })}
                key={fields.description.id}
                placeholder="e.g. Our main marketing site"
                ref={inputRef}
              />
            </Field>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-4">
            <Button
              htmlType="button"
              type="quaternary"
              theme="outline"
              disabled={isPending}
              size="xs"
              onClick={() => {
                form.update({
                  value: {
                    description: defaultValue?.description ?? '',
                  },
                });
              }}>
              Cancel
            </Button>
            <Button htmlType="submit" disabled={isPending} loading={isPending} size="xs">
              {isPending ? 'Saving' : 'Save'}
            </Button>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
