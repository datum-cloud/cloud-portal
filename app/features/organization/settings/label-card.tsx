import { SelectLabels } from '@/components/select-labels/select-labels';
import { useIsPending } from '@/hooks/useIsPending';
import { ILabel } from '@/resources/interfaces/label.interface';
import { updateOrganizationSchema } from '@/resources/schemas/organization.schema';
import { convertObjectToLabels } from '@/utils/helpers/object.helper';
import {
  FieldMetadata,
  FormProvider,
  getFormProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import { Card, CardContent, CardFooter } from '@shadcn/ui/card';
import { Label } from '@shadcn/ui/label';
import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';

/**
 * Organization Label Settings Card Component
 * Displays and allows editing of labels organization settings
 */
export const OrganizationLabelCard = ({ labels }: { labels: ILabel }) => {
  const formId = 'organization-label-form';
  const fetcher = useFetcher({ key: formId });
  const isPending = useIsPending({ formId, fetcherKey: formId });

  const [form, fields] = useForm({
    id: formId,
    constraint: getZodConstraint(updateOrganizationSchema.pick({ labels: true })),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: updateOrganizationSchema.pick({ labels: true }) });
    },
  });

  const labelsControl = useInputControl(fields.labels as FieldMetadata<string[]>);

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
            <Button type="quaternary" theme="borderless" disabled={isPending} onClick={handleReset}>
              Cancel
            </Button>
            <Button htmlType="submit" disabled={isPending || !form.valid} loading={isPending}>
              {isPending ? 'Saving' : 'Save'}
            </Button>
          </CardFooter>
        </fetcher.Form>
      </FormProvider>
    </Card>
  );
};
