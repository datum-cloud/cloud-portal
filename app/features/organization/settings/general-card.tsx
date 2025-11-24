import { Field } from '@/components/field/field';
import { TextCopyBox } from '@/components/text-copy/text-copy-box';
import { useIsPending } from '@/hooks/useIsPending';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { updateOrganizationSchema } from '@/resources/schemas/organization.schema';
import { ROUTE_PATH as ORGANIZATION_UPDATE_ACTION } from '@/routes/api/organizations/$id';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { FormProvider, getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button, CardHeader, CardTitle, toast } from '@datum-ui/components';
import { Card, CardContent, CardFooter } from '@datum-ui/components';
import { Input } from '@datum-ui/components';
import { useEffect } from 'react';
import { Form, useFetcher } from 'react-router';
import { AuthenticityTokenInput, useAuthenticityToken } from 'remix-utils/csrf/react';

/**
 * Organization General Settings Card Component
 * Displays and allows editing of general organization settings
 */
export const OrganizationGeneralCard = ({ organization }: { organization: IOrganization }) => {
  const fetcher = useFetcher({ key: 'update-organization' });
  const isPending = useIsPending({ fetcherKey: 'update-organization' });
  const csrf = useAuthenticityToken();

  const [form, fields] = useForm({
    id: 'update-organization-form',
    constraint: getZodConstraint(updateOrganizationSchema.pick({ description: true })),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: updateOrganizationSchema.pick({ description: true }),
      });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();

      if (submission?.status === 'success') {
        const value = submission.value;
        const payload = {
          ...value,
          csrf: csrf as string,
        };

        fetcher.submit(payload, {
          method: 'PATCH',
          action: getPathWithParams(ORGANIZATION_UPDATE_ACTION, { id: organization?.name }),
          encType: 'application/json',
        });
      }
    },
  });

  const setValue = () => {
    form.update({
      value: {
        description: organization?.displayName ?? '',
      },
    });
  };

  // Update form when organization data changes
  useEffect(() => {
    if (organization) {
      setValue();
    }
  }, [organization]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data?.success) {
        toast.success('Organization updated successfully', {
          description: 'You have successfully updated your organization.',
        });
      } else {
        toast.error('Error', {
          description: fetcher.data.error ?? 'An error occurred while updating your organization',
        });
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <Card className="gap-0 rounded-xl py-0">
      <CardHeader className="border-b px-4.5 py-4">
        <CardTitle className="text-sm font-medium">Organization Info</CardTitle>
      </CardHeader>
      <FormProvider context={form.context}>
        <Form {...getFormProps(form)} autoComplete="off" className="flex flex-col gap-6">
          <CardContent className="px-4.5 py-4">
            <AuthenticityTokenInput />

            <div className="flex max-w-sm flex-col gap-5">
              <Field
                isRequired={organization?.type !== OrganizationType.Personal}
                label="Organization Name"
                errors={fields.description?.errors}>
                {organization && organization?.type === OrganizationType.Personal ? (
                  <TextCopyBox value={organization?.displayName ?? ''} />
                ) : (
                  <Input
                    placeholder="e.g. My Organization"
                    {...getInputProps(fields.description, { type: 'text' })}
                  />
                )}
              </Field>
              <Field label="Resource ID">
                <TextCopyBox value={organization?.name ?? ''} />
              </Field>
            </div>
          </CardContent>
          {organization && organization?.type !== OrganizationType.Personal && (
            <CardFooter className="flex justify-end gap-2 border-t px-4.5 py-4">
              <Button
                htmlType="button"
                type="quaternary"
                theme="outline"
                disabled={isPending}
                size="xs"
                onClick={() => {
                  form.update({
                    value: {
                      description: organization?.displayName ?? '',
                    },
                  });
                }}>
                Cancel
              </Button>
              <Button
                htmlType="submit"
                disabled={isPending || !form.valid}
                loading={isPending}
                size="xs">
                {isPending ? 'Saving' : 'Save'}
              </Button>
            </CardFooter>
          )}
        </Form>
      </FormProvider>
    </Card>
  );
};
