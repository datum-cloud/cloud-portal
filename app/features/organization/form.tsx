import { Field } from '@/components/field/field';
import { InputName } from '@/components/input-name/input-name';
import { TextCopyBox } from '@/components/text-copy/text-copy-box';
import { useIsPending } from '@/hooks/useIsPending';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { organizationSchema } from '@/resources/schemas/organization.schema';
import { paths } from '@/utils/config/paths.config';
import { convertObjectToLabels } from '@/utils/helpers/object.helper';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
import {
  FormProvider,
  getFormProps,
  getInputProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@shadcn/ui/card';
import { Input } from '@shadcn/ui/input';
import { useEffect, useMemo, useRef } from 'react';
import { Form, useNavigate } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const OrganizationForm = ({ defaultValue }: { defaultValue?: IOrganization }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydrated = useHydrated();
  const isPending = useIsPending();
  const navigate = useNavigate();

  const [form, { name, description }] = useForm({
    constraint: getZodConstraint(organizationSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: organizationSchema });
    },
    defaultValue: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  const randomSuffix = useMemo(() => generateRandomString(6), []);

  const nameControl = useInputControl(name);

  const isEdit = useMemo(() => defaultValue?.name !== undefined, [defaultValue]);

  useEffect(() => {
    if (defaultValue) {
      form.update({
        value: {
          name: defaultValue.name,
          description: defaultValue.displayName,
          labels: convertObjectToLabels(defaultValue.labels ?? {}),
        },
      });
    }
  }, [defaultValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit organization' : 'Create a new Standard organization'}</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the organization details to manage projects in Datum Cloud.'
            : 'Ideal for teams with features likes groups, RBAC, etc.'}
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
            {isEdit && (
              <input type="hidden" name="resourceVersion" value={defaultValue?.resourceVersion} />
            )}
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
              <InputName
                required
                description="This unique resource name will be used to identify your organization and cannot be changed."
                field={name}
                baseName={description.value}
              />
              {isEdit && (
                <Field label="ID">
                  <TextCopyBox value={defaultValue?.uid ?? ''} />
                </Field>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {!isEdit && (
              <Button
                type="button"
                variant="link"
                disabled={isPending}
                onClick={() => {
                  navigate(paths.account.organizations.root);
                }}>
                Return to List
              </Button>
            )}
            <Button variant="default" type="submit" disabled={isPending} isLoading={isPending}>
              {isPending ? `${isEdit ? 'Saving' : 'Creating'}` : `${isEdit ? 'Save' : 'Create'}`}
            </Button>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
