import { Field } from '@/components/field/field';
import { InputWithCopy } from '@/components/input-with-copy/input-with-copy';
import { SelectLabels } from '@/components/select-labels/select-labels';
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
import { routes } from '@/constants/routes';
import { useIsPending } from '@/hooks/useIsPending';
import { IOrganization } from '@/resources/interfaces/organization.inteface';
import { organizationSchema } from '@/resources/schemas/organization.schema';
import { generateId, generateRandomString } from '@/utils/idGenerator';
import { cn, convertObjectToLabels } from '@/utils/misc';
import {
  FormProvider,
  getFormProps,
  getInputProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { useEffect, useMemo, useRef } from 'react';
import { Form, useNavigate } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const OrganizationForm = ({ defaultValue }: { defaultValue?: IOrganization }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydrated = useHydrated();
  const isPending = useIsPending();
  const navigate = useNavigate();

  const [form, { name, description, labels }] = useForm({
    constraint: getZodConstraint(organizationSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: organizationSchema });
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

  const randomSuffix = useMemo(() => generateRandomString(6), []);

  const nameControl = useInputControl(name);
  const labelsControl = useInputControl(labels);

  const isEdit = useMemo(() => defaultValue?.id !== undefined, [defaultValue]);

  useEffect(() => {
    if (defaultValue) {
      form.update({
        value: {
          name: defaultValue.organizationId,
          description: defaultValue.displayName,
          labels: convertObjectToLabels(defaultValue.labels ?? {}),
        },
      });
    }
  }, [defaultValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit organization' : 'Create a new organization'}</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the organization details to manage projects in Datum Cloud.'
            : 'Create a new organization to manage projects in Datum Cloud.'}
        </CardDescription>
      </CardHeader>
      <FormProvider context={form.context}>
        <Form
          method="POST"
          autoComplete="off"
          {...getFormProps(form)}
          className="flex flex-col gap-6">
          <AuthenticityTokenInput />

          <CardContent className="space-y-4">
            <div className={cn('flex gap-4', isEdit ? 'flex-col-reverse' : 'flex-col')}>
              <Field
                isRequired
                label="Description"
                description="Enter a short, human-friendly name. Can be changed later."
                errors={description.errors}>
                <Input
                  placeholder="e.g. My Organization"
                  ref={inputRef}
                  onInput={(e: React.FormEvent<HTMLInputElement>) => {
                    const value = (e.target as HTMLInputElement).value;

                    if (value && !isEdit) {
                      nameControl.change(generateId(value, { randomText: randomSuffix }));
                    }
                  }}
                  {...getInputProps(description, { type: 'text' })}
                />
              </Field>
              <Field
                isRequired
                label="Name"
                description="A namespace-unique stable identifier for your organization. This cannot be changed once the organization is created"
                errors={name.errors}>
                {isEdit ? (
                  <InputWithCopy value={defaultValue?.name ?? ''} className="bg-muted h-9" />
                ) : (
                  <Input
                    readOnly={isEdit}
                    placeholder="e.g. my-organization-343j33"
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
                )}
              </Field>
              {isEdit && (
                <Field label="ID">
                  <InputWithCopy value={defaultValue?.uid ?? ''} className="bg-muted h-9" />
                </Field>
              )}
            </div>
            <Field
              label="Labels"
              errors={labels.errors}
              description="Add labels to help identify, organize, and filter your projects.">
              <SelectLabels
                defaultValue={labels.value as string[]}
                onChange={(value) => {
                  labelsControl.change(value);
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
                navigate(routes.account.organizations.root);
              }}>
              Return to List
            </Button>
            <Button variant="default" type="submit" disabled={isPending} isLoading={isPending}>
              {isPending ? `${isEdit ? 'Saving' : 'Creating'}` : `${isEdit ? 'Save' : 'Create'}`}
            </Button>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
