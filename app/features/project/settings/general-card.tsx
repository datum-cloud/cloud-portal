import { Field } from '@/components/field/field';
import { TextCopyBox } from '@/components/text-copy/text-copy-box';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIsPending } from '@/hooks/useIsPending';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { updateProjectSchema } from '@/resources/schemas/project.schema';
import { FormProvider, getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';

/**
 * Project General Settings Card Component
 * Displays and allows editing of general project settings
 */
export const ProjectGeneralCard = ({ project }: { project: IProjectControlResponse }) => {
  const formId = 'project-form';
  const fetcher = useFetcher({ key: formId });
  const isPending = useIsPending({ formId, fetcherKey: formId });

  const [form, fields] = useForm({
    id: formId,
    constraint: getZodConstraint(updateProjectSchema.pick({ description: true })),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: updateProjectSchema.pick({ description: true }),
      });
    },
  });

  const setValue = () => {
    form.update({
      value: {
        description: project?.description ?? '',
      },
    });
  };

  // Update form when organization data changes
  useEffect(() => {
    if (project) {
      setValue();
    }
  }, [project]);

  // Handle form reset
  const handleReset = () => {
    setValue();
  };

  return (
    <Card>
      <FormProvider context={form.context}>
        <fetcher.Form
          method="POST"
          autoComplete="off"
          {...getFormProps(form)}
          className="flex flex-col gap-6">
          <CardContent className="grid grid-cols-12">
            <Label className="text-foreground col-span-12 items-start lg:col-span-5">
              General settings
            </Label>

            <div className="relative col-span-12 flex flex-col gap-6 lg:col-span-7">
              <AuthenticityTokenInput />

              <div className="flex flex-col gap-6">
                <Field isRequired label="Project display name" errors={fields.description?.errors}>
                  <Input
                    placeholder="e.g. My Project"
                    {...getInputProps(fields.description, { type: 'text' })}
                  />
                </Field>
                <Field label="Project name">
                  <TextCopyBox value={project?.name ?? ''} />
                </Field>
                <Field label="Project UID">
                  <TextCopyBox value={project?.uid ?? ''} />
                </Field>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="link" disabled={isPending} onClick={handleReset}>
              Cancel
            </Button>
            <Button
              variant="default"
              type="submit"
              disabled={isPending || !form.valid}
              isLoading={isPending}>
              {isPending ? 'Saving' : 'Save'}
            </Button>
          </CardFooter>
        </fetcher.Form>
      </FormProvider>
    </Card>
  );
};
