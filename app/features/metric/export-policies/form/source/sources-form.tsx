import { SourceField } from './source-field';
import { ExportPolicySourceTypeEnum } from '@/resources/export-policies';
import {
  ExportPolicySourceFieldSchema,
  ExportPolicySourcesSchema,
  UpdateExportPolicySchema,
} from '@/resources/export-policies';
import { useForm, useFormMetadata } from '@conform-to/react';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useMemo, useEffect } from 'react';

export const SourcesForm = ({
  fields,
  defaultValue,
  isEdit = false,
}: {
  fields: ReturnType<typeof useForm<UpdateExportPolicySchema>>[1];
  defaultValue?: ExportPolicySourcesSchema;
  isEdit?: boolean;
}) => {
  const form = useFormMetadata('export-policy-form');
  const fieldList = fields.sources.getFieldList();
  const values = useMemo(() => {
    return defaultValue?.sources
      ? defaultValue.sources
      : ((defaultValue ?? []) as ExportPolicySourceFieldSchema[]);
  }, [defaultValue]);

  useEffect(() => {
    if (values) {
      form.update({
        name: fields.sources.name,
        value: values as ExportPolicySourceFieldSchema[],
      });
    }
  }, [values]);

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-4">
        {fieldList.map((field, index) => {
          const sourceFields = field.getFieldset();
          return (
            <div className="relative flex items-center gap-2 rounded-md border p-4" key={field.key}>
              <SourceField
                isEdit={isEdit}
                isMultiple={fieldList.length > 1}
                fields={
                  sourceFields as unknown as ReturnType<
                    typeof useForm<ExportPolicySourceFieldSchema>
                  >[1]
                }
                defaultValue={values?.[index] as ExportPolicySourceFieldSchema}
              />

              {fieldList.length > 1 && (
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="small"
                  className={cn('text-destructive relative top-2 w-fit')}
                  onClick={() => form.remove({ name: fields.sources.name, index })}>
                  <TrashIcon className="size-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <Button
        type="quaternary"
        theme="outline"
        size="small"
        className="w-fit"
        onClick={() =>
          form.insert({
            name: fields.sources.name,
            defaultValue: {
              name: '',
              type: ExportPolicySourceTypeEnum.METRICS,
              metricQuery: '{}',
            },
          })
        }>
        <PlusIcon className="size-4" />
        Add Source
      </Button>
    </div>
  );
};
