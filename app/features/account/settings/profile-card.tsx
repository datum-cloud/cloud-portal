import { Field } from '@/components/field/field';
import { useIsPending } from '@/hooks/useIsPending';
import { useApp } from '@/providers/app.provider';
import { userSchema } from '@/resources/schemas/user.schema';
import { ROUTE_PATH as USER_UPDATE_ACTION } from '@/routes/api/user';
import { FormProvider, getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button, toast } from '@datum-ui/components';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@datum-ui/components';
import { Input } from '@datum-ui/components';
import { useEffect } from 'react';
import { Form, useFetcher } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

/**
 * Account Profile Settings Card Component
 * Displays and allows editing of general account settings
 */
export const AccountProfileSettingsCard = () => {
  const { user, setUser } = useApp();
  const csrf = useAuthenticityToken();
  const formId = 'account-form';
  const fetcher = useFetcher({ key: formId });
  const isPending = useIsPending({ formId, fetcherKey: formId });

  const [form, fields] = useForm({
    id: formId,
    constraint: getZodConstraint(userSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: userSchema });
    },
    onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();

      if (submission?.status === 'success') {
        const value = submission.value;
        const payload = {
          firstName: value.firstName,
          lastName: value.lastName,
          email: value.email,
          csrf: csrf as string,
        };

        fetcher.submit(payload, {
          method: 'PATCH',
          action: USER_UPDATE_ACTION,
          encType: 'application/json',
        });
      }
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

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data?.success) {
        toast.success('Profile updated successfully', {
          description: 'You have successfully updated your profile.',
        });
      } else {
        toast.error('Error', {
          description: fetcher.data.error ?? 'An error occurred while updating your profile',
        });
        setUser(fetcher?.data?.data);
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <FormProvider context={form.context}>
        <Form
          {...getFormProps(form)}
          id={formId}
          method="POST"
          autoComplete="off"
          className="flex flex-col gap-6">
          <CardContent>
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
              <input hidden {...getInputProps(fields.email, { type: 'text' })} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button htmlType="submit" disabled={isPending || !form.valid} loading={isPending}>
              {isPending ? 'Saving' : 'Save'}
            </Button>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
