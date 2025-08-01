import { Field } from '@/components/forms/field/field';
import { SelectOrganization } from '@/components/forms/selects/select-organization';
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
import { routes } from '@/constants/paths';
import { useIsPending } from '@/hooks/useIsPending';
import { useApp } from '@/providers/app.provider';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { projectSchema } from '@/resources/schemas/project.schema';
import { generateId, generateRandomString } from '@/utils/idGenerator';
import { getPathWithParams } from '@/utils/path';
import { getFormProps, getInputProps, useForm, useInputControl } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { RocketIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Form, useNavigate } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const ProjectCreateForm = () => {
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

  const randomSuffix = useMemo(() => generateRandomString(6), []);

  const nameControl = useInputControl(name);
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
                navigate(getPathWithParams(routes.org.projects.new, { orgId: org.name }));
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
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                const value = (e.target as HTMLInputElement).value;

                if (value) {
                  nameControl.change(generateId(value, { randomText: randomSuffix }));
                }
              }}
              {...getInputProps(description, { type: 'text' })}
            />
          </Field>
          <Field
            isRequired
            label="Name"
            description="A namespace-unique stable identifier for your project. This cannot be changed once the project is created"
            errors={name.errors}>
            <Input
              placeholder="e.g. my-project-343j33"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = (e.target as HTMLInputElement).value;
                nameControl.change(value);
              }}
              onBlur={(e: React.FormEvent<HTMLInputElement>) => {
                const value = (e.target as HTMLInputElement).value;
                if (value.length === 0) {
                  nameControl.change(
                    generateId(description.value ?? '', { randomText: randomSuffix })
                  );
                }
              }}
              {...getInputProps(name, { type: 'text' })}
            />
          </Field>
          {/* <Field
            label="Labels"
            errors={labels.errors}
            description="Add labels to help identify, organize, and filter your projects.">
            <SelectLabels
              defaultValue={labels.value as string[]}
              onChange={(value) => {
                labelsControl.change(value);
              }}
            />
          </Field> */}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="link"
            disabled={isPending}
            onClick={() => {
              navigate(
                getPathWithParams(routes.org.projects.root, {
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
