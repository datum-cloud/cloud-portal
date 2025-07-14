import { SelectLabels } from '@/components/select-labels/select-labels';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useIsPending } from '@/hooks/useIsPending';
import { ILabel } from '@/resources/interfaces/label.interface';
import { updateProjectSchema } from '@/resources/schemas/project.schema';
import { convertObjectToLabels } from '@/utils/misc';
import { FormProvider, getFormProps, useForm, useInputControl } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';

/**
 * Project Label Settings Card Component
 * Displays and allows editing of labels project settings
 */
export const ProjectLabelCard = ({ labels }: { labels: ILabel }) => {
  const formId = 'project-label-form';
  const fetcher = useFetcher({ key: formId });
  const isPending = useIsPending({ formId, fetcherKey: formId });

  const [form, fields] = useForm({
    id: formId,
    constraint: getZodConstraint(updateProjectSchema.pick({ labels: true })),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: updateProjectSchema.pick({ labels: true }) });
    },
  });

  const labelsControl = useInputControl(fields.labels);

  const setValue = () => {
    form.update({
      value: {
        labels: convertObjectToLabels(labels ?? {}),
      },
    });
  };

  // Update form when labels data changes
  useEffect(() => {
    if (labels) {
      setValue();
    }
  }, [labels]);

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
            <Label className="text-foreground col-span-12 items-start lg:col-span-5">Labels</Label>

            <div className="relative col-span-12 flex flex-col gap-6 lg:col-span-7">
              <AuthenticityTokenInput />

              <div className="flex flex-col gap-6">
                <SelectLabels
                  defaultValue={fields.labels.value as string[]}
                  onChange={(value) => {
                    labelsControl.change(value);
                  }}
                />
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
