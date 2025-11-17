import { Field } from '@/components/field/field';
import { InputName } from '@/components/input-name/input-name';
import { useIsPending } from '@/hooks/useIsPending';
import { useApp } from '@/providers/app.provider';
import { projectSchema } from '@/resources/schemas/project.schema';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-ui/components';
import { Input } from '@datum-ui/components';
import { RocketIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Form, useNavigate } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const CreateProjectForm = () => {
  const { organization } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydrated = useHydrated();
  const isPending = useIsPending();
  const navigate = useNavigate();

  const [form, { name, description }] = useForm({
    constraint: getZodConstraint(projectSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: projectSchema });
    },
    defaultValue: {
      name: '',
      description: '',
      labels: [] as string[],
    },
  });

  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new project</CardTitle>
        <CardDescription>
          Add a project to manage your core network services, workloads, and assets.
        </CardDescription>
      </CardHeader>
      <Form
        method="POST"
        autoComplete="off"
        {...getFormProps(form)}
        className="mt-6 flex flex-col gap-10">
        <AuthenticityTokenInput />

        <CardContent className="space-y-10">
          <input type="hidden" name="orgEntityId" value={organization?.name} />

          <Field
            isRequired
            label="Description"
            description="Enter a short, human-friendly name. Can be changed later."
            errors={description.errors}>
            <Input
              placeholder="e.g. My Project"
              ref={inputRef}
              {...getInputProps(description, { type: 'text' })}
            />
          </Field>
          <InputName
            required
            description="This unique resource name will be used to identify your project and cannot be changed."
            field={name}
            baseName={description.value}
          />
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="quaternary"
            theme="borderless"
            disabled={isPending}
            onClick={() => {
              navigate(
                getPathWithParams(paths.org.detail.projects.root, {
                  orgId: organization?.name,
                })
              );
            }}>
            Return to List
          </Button>
          <Button htmlType="submit" disabled={isPending} loading={isPending}>
            {isPending ? 'Creating' : 'Create'} Project
            <RocketIcon className="size-4" />
          </Button>
        </CardFooter>
      </Form>
    </Card>
  );
};
