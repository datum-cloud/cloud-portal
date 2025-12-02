import { SelectRole } from '@/components/select-role/select-role';
import { invitationFormSchema } from '@/resources/schemas/invitation.schema';
import { getSelectProps, useInputControl } from '@conform-to/react';
import { TagsInput } from '@datum-ui/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-ui/components';
import { Form, type FormFieldRenderProps } from '@datum-ui/components/new-form';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';

// Email validator for individual email tags
const emailValidator = z.email({ error: 'Please enter a valid email address' });

/**
 * RoleFieldContent - Extracted component to properly use hooks
 * This is needed because useInputControl cannot be called inside a callback
 */
const RoleFieldContent = ({ control, meta, fields }: FormFieldRenderProps) => {
  const roleNamespaceControl = useInputControl(fields.roleNamespace as any);
  const roleValue = Array.isArray(control.value) ? control.value[0] : control.value;

  return (
    <SelectRole
      {...getSelectProps(fields.role)}
      name={meta.name}
      id={meta.id}
      key={meta.id}
      defaultValue={roleValue}
      onSelect={(value) => {
        control.change(value.value);
        roleNamespaceControl.change(value.namespace ?? '');
      }}
    />
  );
};

export const InvitationForm = () => {
  const navigate = useNavigate();

  // State to track real-time validation errors from TagsInput
  const [tagsInputError, setTagsInputError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Member</CardTitle>
        <CardDescription>Invite a member to your organization.</CardDescription>
      </CardHeader>
      <Form.Root
        id="invitation-form"
        schema={invitationFormSchema}
        defaultValues={{
          role: '',
          roleNamespace: '',
        }}
        className="mt-6 flex flex-col gap-10">
        <CardContent className="space-y-10">
          {/* Role field with extracted component for proper hooks usage */}
          <Form.Field name="role" label="Role" required>
            {(props) => <RoleFieldContent {...props} />}
          </Form.Field>

          {/* Emails field with render function pattern */}
          <Form.Field
            name="emails"
            label="Emails"
            required
            description="Enter one or more emails (e.g., example@example.com). Use comma or press Enter to add each email as a tag.">
            {({ control, meta, field }) => (
              <>
                <TagsInput
                  {...getSelectProps(field, { value: false })}
                  validator={emailValidator}
                  showValidationErrors={false}
                  value={(control.value as string[]) || []}
                  onValueChange={(newValue) => {
                    control.change(newValue);
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
                {/* Display additional TagsInput validation errors */}
                {tagsInputError && !meta.errors?.includes(tagsInputError) && (
                  <p className="text-destructive text-sm font-medium">{tagsInputError}</p>
                )}
              </>
            )}
          </Form.Field>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Form.Button onClick={() => navigate(-1)} disableOnSubmit>
            Return to List
          </Form.Button>
          <Form.Submit loadingText="Inviting">Invite</Form.Submit>
        </CardFooter>
      </Form.Root>
    </Card>
  );
};
