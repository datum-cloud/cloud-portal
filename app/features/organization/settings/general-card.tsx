import { Field } from '@/components/field/field';
import { TextCopyBox } from '@/components/text-copy/text-copy-box';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useIsPending } from '@/hooks/useIsPending';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { updateOrganizationSchema } from '@/resources/schemas/organization.schema';
import { FormProvider, getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';

/**
 * Organization General Settings Card Component
 * Displays and allows editing of general organization settings
 */
export const OrganizationGeneralCard = ({ organization }: { organization: IOrganization }) => {
  const formId = 'organization-form';
  const fetcher = useFetcher({ key: formId });
  const isPending = useIsPending({ formId, fetcherKey: formId });

  const [form, fields] = useForm({
    id: formId,
    constraint: getZodConstraint(updateOrganizationSchema.pick({ description: true })),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: updateOrganizationSchema.pick({ description: true }),
      });
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

  return (
    <Card>
      <FormProvider context={form.context}>
        <fetcher.Form
          method="POST"
          autoComplete="off"
          {...getFormProps(form)}
          className="flex flex-col gap-6">
          <CardContent>
            <AuthenticityTokenInput />

            <div className="flex flex-col gap-6">
              <Field isRequired label="Description" errors={fields.description?.errors}>
                <Input
                  placeholder="e.g. My Organization"
                  {...getInputProps(fields.description, { type: 'text' })}
                />
              </Field>
              <Field label="Name">
                <TextCopyBox value={organization?.name ?? ''} />
              </Field>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {/* <Button type="button" variant="link" disabled={isPending} onClick={handleReset}>
              Cancel
            </Button> */}
            <Button
              variant="default"
              type="submit"
              disabled={isPending || !form.valid}
              isLoading={isPending}>
              {isPending ? 'Saving' : 'Save'}
            </Button>
          </CardFooter>
        </fetcher.Form>
      </FormProvider>
    </Card>
  );
};
