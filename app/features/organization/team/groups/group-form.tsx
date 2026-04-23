import { createGroupSchema, type CreateGroupInput } from '@/resources/groups';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { useNavigate } from 'react-router';

interface GroupFormProps {
  onSubmit: (data: CreateGroupInput) => void;
  isSubmitting?: boolean;
}

export const GroupForm = ({ onSubmit, isSubmitting }: GroupFormProps) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Group</CardTitle>
        <CardDescription>Create a new IAM group for your organization.</CardDescription>
      </CardHeader>
      <Form.Root schema={createGroupSchema} mode="onBlur" onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <Form.Field name="name" label="Group Name" required>
            <Form.Input placeholder="platform-engineering" />
            <Form.Description>
              Lowercase letters, numbers, and hyphens only. Must start with a letter. 3-63
              characters.
            </Form.Description>
          </Form.Field>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button
            type="quaternary"
            theme="outline"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}>
            Cancel
          </Button>
          <Form.Submit disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Group'}
          </Form.Submit>
        </CardFooter>
      </Form.Root>
    </Card>
  );
};
