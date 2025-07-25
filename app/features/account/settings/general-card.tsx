import { Field } from '@/components/field/field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useIsPending } from '@/hooks/useIsPending';
import { useApp } from '@/providers/app.provider';
import { userSchema } from '@/resources/schemas/user.schema';
import { FormProvider, getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';

/**
 * Account General Settings Card Component
 * Displays and allows editing of general account settings
 */
export const AccountGeneralCard = () => {
  const { user } = useApp();
  const formId = 'account-form';
  const fetcher = useFetcher({ key: formId });
  const isPending = useIsPending({ formId, fetcherKey: formId });

  const [form, fields] = useForm({
    id: formId,
    constraint: getZodConstraint(userSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: userSchema });
    },
  });

  // Update form when account data changes
  useEffect(() => {
    if (user) {
      form.update({
        value: {
          firstName: user?.givenName ?? '',
          lastName: user?.familyName ?? '',
          email: user?.email ?? '',
        },
      });
    }
  }, [user]);

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

            <div className="flex items-center gap-6">
              <Field
                isRequired
                label="First Name"
                errors={fields.firstName?.errors}
                className="w-1/2">
                <Input
                  placeholder="e.g. John"
                  {...getInputProps(fields.firstName, { type: 'text' })}
                />
              </Field>
              <Field
                isRequired
                label="Last Name"
                errors={fields.lastName?.errors}
                className="w-1/2">
                <Input
                  placeholder="e.g. Doe"
                  {...getInputProps(fields.lastName, { type: 'text' })}
                />
              </Field>
            </div>
            <Field label="Email" className="mt-6 w-full">
              <Input
                readOnly
                placeholder="e.g. john.doe@example.com"
                {...getInputProps(fields.email, { type: 'email' })}
              />
            </Field>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
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
