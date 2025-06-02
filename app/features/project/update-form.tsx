import { Field } from '@/components/field/field';
import { InputWithCopy } from '@/components/input-with-copy/input-with-copy';
import { SelectLabels } from '@/components/select-labels/select-labels';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useIsPending } from '@/hooks/useIsPending';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { updateProjectSchema } from '@/resources/schemas/project.schema';
import { convertObjectToLabels } from '@/utils/misc';
import {
  FieldMetadata,
  getFormProps,
  getInputProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { useEffect, useRef } from 'react';
import { Form } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const UpdateProjectForm = ({ defaultValue }: { defaultValue: IProjectControlResponse }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydrated = useHydrated();
  const isPending = useIsPending();

  const [form, fields] = useForm({
    constraint: getZodConstraint(updateProjectSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: updateProjectSchema });
    },
  });

  const displayNameControl = useInputControl(fields.description as FieldMetadata<string>);
  const labelsControl = useInputControl(fields.labels as FieldMetadata<string[]>);

  useEffect(() => {
    if (defaultValue) {
      form.update({
        value: {
          description: defaultValue.description,
          labels: convertObjectToLabels(defaultValue.labels ?? {}),
        },
      });
    }
  }, [defaultValue]);

  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Settings</CardTitle>
      </CardHeader>

      <Form
        method="POST"
        autoComplete="off"
        {...getFormProps(form)}
        className="flex flex-col gap-6">
        <AuthenticityTokenInput />

        {defaultValue && (
          <>
            <input type="hidden" name="resourceVersion" value={defaultValue?.resourceVersion} />
            <input type="hidden" name="orgEntityId" value={defaultValue?.organizationId} />
          </>
        )}

        <CardContent className="space-y-4">
          <Field
            label="Immutable Name"
            tooltipInfo="Used to identify your project in the dashboard, Datum CLI, and in the URL of your deployments">
            <InputWithCopy value={defaultValue.name ?? ''} className="bg-muted h-9" />
          </Field>

          <Field
            isRequired
            label="Display Name"
            description="Enter a short, human-friendly name. Can be changed later."
            errors={fields.description.errors}>
            <Input
              placeholder="e.g. My Project"
              ref={inputRef}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                const value = (e.target as HTMLInputElement).value;
                displayNameControl.change(value);
              }}
              {...getInputProps(fields.description, { type: 'text' })}
            />
          </Field>

          <Field
            label="Labels"
            errors={fields.labels.errors}
            description="Add labels to help identify, organize, and filter your projects.">
            <SelectLabels
              defaultValue={fields.labels.value as string[]}
              onChange={(value) => {
                labelsControl.change(value);
              }}
            />
          </Field>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="default" type="submit" disabled={isPending} isLoading={isPending}>
            {isPending ? 'Updating' : 'Update'}
          </Button>
        </CardFooter>
      </Form>
    </Card>
  );
};
