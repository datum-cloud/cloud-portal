import { Field } from '@/components/field/field';
import { InputName } from '@/components/input-name/input-name';
import { SelectOrganization } from '@/components/select-organization/select-organization';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useIsPending } from '@/hooks/useIsPending';
import { useApp } from '@/providers/app.provider';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { projectSchema } from '@/resources/schemas/project.schema';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { getFormProps, getInputProps, useForm, useInputControl } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { RocketIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Form, useNavigate } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const CreateProjectForm = () => {
  const { organization } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydrated = useHydrated();
  const isPending = useIsPending();
  const navigate = useNavigate();

  const [currentOrg, setCurrentOrg] = useState<IOrganization | undefined>(organization);

  const [form, { name, description, orgEntityId }] = useForm({
    constraint: getZodConstraint(projectSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: projectSchema });
    },
    defaultValue: {
      orgEntityId: organization?.name,
      name: '',
      description: '',
      labels: [] as string[],
    },
  });

  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  useEffect(() => {
    setCurrentOrg(organization);
  }, [organization]);

  const orgEntityIdControl = useInputControl(orgEntityId);

  useEffect(() => {
    orgEntityIdControl.change(organization?.name);
  }, [organization]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new project</CardTitle>
        <CardDescription>Create a new project to get started with Datum Cloud.</CardDescription>
      </CardHeader>
      <Form
        method="POST"
        autoComplete="off"
        {...getFormProps(form)}
        className="flex flex-col gap-6">
        <AuthenticityTokenInput />

        <CardContent className="space-y-4">
          <Field isRequired label="Choose organization">
            <SelectOrganization
              hideNewOrganization
              currentOrg={currentOrg!}
              triggerClassName="py-2"
              onSelect={(org) => {
                setCurrentOrg(org);
                orgEntityIdControl.change(org.name);
                navigate(getPathWithParams(paths.org.detail.projects.new, { orgId: org.name }));
              }}
            />
          </Field>
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
            type="button"
            variant="link"
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
          <Button variant="default" type="submit" disabled={isPending} isLoading={isPending}>
            {isPending ? 'Creating' : 'Create'} Project
            <RocketIcon className="size-4" />
          </Button>
        </CardFooter>
      </Form>
    </Card>
  );
};
