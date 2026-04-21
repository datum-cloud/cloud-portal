import { SelectRole } from '@/components/select-role/select-role';
import { invitationFormSchema, type InvitationFormSchema } from '@/resources/invitations';
import { toStringArray } from '@/utils/helpers/form-value.helper';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Form, useField, type FormFieldRenderProps } from '@datum-cloud/datum-ui/form';
import { TagsInput } from '@datum-cloud/datum-ui/tag-input';
import { useNavigate } from 'react-router';

/**
 * RoleFieldContent - Extracted component to properly use hooks
 * This is needed because useField cannot be called inside a callback
 */
const RoleFieldContent = ({ control, meta }: FormFieldRenderProps) => {
  const { control: roleNamespaceControl } = useField('roleNamespace');
  const roleValue = Array.isArray(control.value)
    ? (control.value[0] as string | undefined)
    : (control.value as string | undefined);

  return (
    <SelectRole
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

interface InvitationFormProps {
  onSubmit: (data: InvitationFormSchema) => void;
  isSubmitting?: boolean;
}

export const InvitationForm = ({ onSubmit, isSubmitting }: InvitationFormProps) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Member</CardTitle>
        <CardDescription>Invite a member to your organization.</CardDescription>
      </CardHeader>
      <Form.Root
        id="invitation-form"
        schema={invitationFormSchema}
        mode="onBlur"
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
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

          {/* Emails field - validation handled by form schema */}
          <Form.Field
            name="emails"
            label="Emails"
            required
            description="Enter one or more emails (e.g., example@example.com). Press Enter, comma, or semicolon to add each email.">
            {({ control, field }) => (
              <TagsInput
                id={field.id}
                name={field.name}
                value={toStringArray(control.value)}
                onValueChange={control.change}
                placeholder="Enter email"
                delimiters={['Enter', ',', ';', ' ']}
                normalizer={(val) => val.toLowerCase()}
                showValidationErrors={false}
                data-e2e="invite-emails-input"
              />
            )}
          </Form.Field>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Form.Button onClick={() => navigate(-1)} disableOnSubmit>
            Return to List
          </Form.Button>
          <Form.Submit loadingText="Inviting" data-e2e="invite-submit">
            Invite
          </Form.Submit>
        </CardFooter>
      </Form.Root>
    </Card>
  );
};
