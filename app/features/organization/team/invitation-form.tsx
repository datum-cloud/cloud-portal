import { Field } from '@/components/field/field';
import { SelectRole } from '@/components/select-role/select-role';
import { invitationFormSchema } from '@/resources/schemas/invitation.schema';
import {
  FormProvider,
  getFormProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import { TagsInput } from '@datum-ui/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-ui/components';
import { useState } from 'react';
import { Form, useNavigate } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { z } from 'zod';

// Email validator for individual email tags
const emailValidator = z.email({ error: 'Please enter a valid email address' });

export const InvitationForm = () => {
  const navigate = useNavigate();

  // Manual loading state - set to true on submit, reset by re-render after navigation
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State to track real-time validation errors from TagsInput
  const [tagsInputError, setTagsInputError] = useState<string | null>(null);

  const [form, fields] = useForm({
    id: 'invitation-form',
    constraint: getZodConstraint(invitationFormSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: invitationFormSchema });
    },
    defaultValue: {
      role: '',
      roleNamespace: '',
    },
  });

  const roleControl = useInputControl(fields.role);
  const roleNamespaceControl = useInputControl(fields.roleNamespace);
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
          className="flex flex-col gap-10"
          onSubmit={() => {
            // Set loading state when form is submitted
            setIsSubmitting(true);
          }}>
          <AuthenticityTokenInput />
          <CardContent className="space-y-10">
            <Field isRequired label="Role" errors={fields.role.errors}>
              <SelectRole
                {...getSelectProps(fields.role)}
                name={fields.role.name}
                id={fields.role.id}
                key={fields.role.id}
                defaultValue={roleControl.value}
                onSelect={(value) => {
                  roleControl.change(value.value);
                  roleNamespaceControl.change(value.namespace ?? '');
                }}
              />
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
              type="quaternary"
              theme="borderless"
              disabled={isSubmitting}
              onClick={() => {
                navigate(-1);
              }}>
              Return to List
            </Button>
            <Button htmlType="submit" disabled={isSubmitting} loading={isSubmitting}>
              {isSubmitting ? 'Inviting' : 'Invite'}
            </Button>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
