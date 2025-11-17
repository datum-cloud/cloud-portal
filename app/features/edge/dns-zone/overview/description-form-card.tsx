import { Field } from '@/components/field/field';
import { useIsPending } from '@/hooks/useIsPending';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { formDnsZoneSchema } from '@/resources/schemas/dns-zone.schema';
import { ROUTE_PATH as DNS_ZONES_ACTIONS_PATH } from '@/routes/api/dns-zones';
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
import { Form, useFetcher } from 'react-router';
import { AuthenticityTokenInput, useAuthenticityToken } from 'remix-utils/csrf/react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const DescriptionFormCard = ({
  projectId,
  defaultValue,
}: {
  projectId: string;
  defaultValue: IDnsZoneControlResponse;
}) => {
  const fetcher = useFetcher({ key: 'description-form' });
  const isHydrated = useHydrated();
  const isPending = useIsPending({ fetcherKey: 'description-form' });
  const inputRef = useRef<HTMLInputElement>(null);
  const csrf = useAuthenticityToken();

  const [form, fields] = useForm({
    id: 'description-form',
    constraint: getZodConstraint(formDnsZoneSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: formDnsZoneSchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();

      if (submission?.status !== 'success') return;

      fetcher.submit(
        {
          id: defaultValue?.name ?? '',
          projectId,
          domainName: defaultValue?.domainName ?? '',
          description: submission.value.description ?? '',
          csrf,
        },
        {
          method: 'PATCH',
          action: DNS_ZONES_ACTIONS_PATH,
          encType: 'application/json',
        }
      );
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

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success, error } = fetcher.data;

      if (success) {
        toast.success('DNS Zone description updated successfully', {
          description: 'You have successfully updated the DNS Zone description.',
        });
      } else {
        toast.error('Error', {
          description: error ?? 'An error occurred while updating the DNS Zone description',
        });
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <Card className="rounded-xl pt-5 pb-4">
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
