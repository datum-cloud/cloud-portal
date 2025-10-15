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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagsInput } from '@/components/ui/tag-input';
import { useIsPending } from '@/hooks/useIsPending';
import { Roles } from '@/resources/interfaces/role.interface';
import { invitationFormSchema } from '@/resources/schemas/invitation.schema';
import {
  FormProvider,
  getFormProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { useState } from 'react';
import { Form, useNavigate } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { z } from 'zod';

// Email validator for individual email tags
const emailValidator = z.email({ error: 'Please enter a valid email address' });

export const InvitationForm = () => {
  const isPending = useIsPending();
  const navigate = useNavigate();

  // State to track real-time validation errors from TagsInput
  const [tagsInputError, setTagsInputError] = useState<string | null>(null);

  const [form, fields] = useForm({
    id: 'invitation-form',
    constraint: getZodConstraint(invitationFormSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: invitationFormSchema });
    },
    defaultValue: {
      role: Roles.Owner,
    },
  });

  const roleControl = useInputControl(fields.role);
  const emailsControl = useInputControl(fields.emails);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Member</CardTitle>
        <CardDescription>Invite a member to your organization.</CardDescription>
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
            <Field isRequired label="Role" errors={fields.role.errors}>
              <Select
                {...getSelectProps(fields.role)}
                key={fields.role.id}
                defaultValue={fields.role.value}
                value={fields.role.value}
                onValueChange={(value) => {
                  roleControl.change(value);
                }}>
                <SelectTrigger className="capitalize">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(Roles).map((mode) => (
                    <SelectItem key={mode} value={mode} className="capitalize">
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              isRequired
              label="Emails"
              errors={
                // Combine conform errors with TagsInput real-time validation errors
                tagsInputError
                  ? [...(fields.emails.errors || []), tagsInputError]
                  : fields.emails.errors
              }
              className="w-full"
              description="Enter one or more emails (e.g., example@example.com). Use comma or press Enter to add each email as a tag.">
              <TagsInput
                {...getSelectProps(fields.emails, { value: false })}
                validator={emailValidator}
                showValidationErrors={false}
                value={(emailsControl.value as string[]) || []}
                onValueChange={(newValue) => {
                  emailsControl.change(newValue);
                  // Clear TagsInput error when value changes successfully
                  if (tagsInputError) {
                    setTagsInputError(null);
                  }
                }}
                placeholder="Enter email"
                onValidationError={(error) => {
                  // Set the error in component state to display in Field component
                  setTagsInputError(error);
                }}
              />
            </Field>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="link"
              disabled={isPending}
              onClick={() => {
                navigate(-1);
              }}>
              Return to List
            </Button>
            <Button variant="default" type="submit" disabled={isPending} isLoading={isPending}>
              {isPending ? 'Inviting' : 'Invite'}
            </Button>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
