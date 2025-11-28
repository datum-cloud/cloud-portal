import { InputName } from '@/components/input-name/input-name';
import { organizationSchema } from '@/resources/schemas/organization.schema';
import { paths } from '@/utils/config/paths.config';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-ui/components';
import { Form } from '@datum-ui/new-form';
import { useNavigate } from 'react-router';

export const OrganizationForm = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new Standard organization</CardTitle>
        <CardDescription>Ideal for teams with features likes groups, RBAC, etc.</CardDescription>
      </CardHeader>
      <Form.Root
        schema={organizationSchema}
        defaultValues={{
          name: '',
          description: '',
        }}
        className="mt-6 flex flex-col gap-10">
        <CardContent className="space-y-10">
          <div className="flex flex-col gap-10">
            {/* Description field with auto-generate name functionality */}
            <Form.Field
              name="description"
              label="Description"
              description="Enter a short, human-friendly name. Can be changed later."
              required>
              <Form.Input placeholder="e.g. My Organization" autoFocus />
            </Form.Field>

            {/* Resource name field using InputName component */}
            <Form.Field name="name">
              {({ field, fields }) => (
                <InputName
                  required
                  description="This unique resource name will be used to identify your organization and cannot be changed."
                  field={field}
                  baseName={fields.description?.value as string}
                />
              )}
            </Form.Field>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Form.Button onClick={() => navigate(paths.account.organizations.root)}>
            Return to List
          </Form.Button>
          <Form.Submit loadingText="Creating">Create</Form.Submit>
        </CardFooter>
      </Form.Root>
    </Card>
  );
};
