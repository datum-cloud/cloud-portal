import { SinkField } from './sink-field';
import { Button } from '@/components/ui/button';
import { ExportPolicySinkType } from '@/resources/interfaces/export-policy.interface';
import {
  ExportPolicySinkFieldSchema,
  ExportPolicySinksSchema,
  ExportPolicySourceFieldSchema,
  UpdateExportPolicySchema,
} from '@/resources/schemas/export-policy.schema';
import { cn } from '@/utils/common';
import { useForm, useFormMetadata } from '@conform-to/react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useMemo, useEffect } from 'react';

export const SinksForm = ({
  fields,
  defaultValue,
  isEdit = false,
  sourceList,
  projectId,
}: {
  fields: ReturnType<typeof useForm<UpdateExportPolicySchema>>[1];
  defaultValue?: ExportPolicySinksSchema;
  isEdit?: boolean;
  sourceList?: ExportPolicySourceFieldSchema[];
  projectId?: string;
}) => {
  const form = useFormMetadata('export-policy-form');
  const fieldList = fields.sinks.getFieldList();
  const sourceFieldList = fields.sources.getFieldList();

  const values = useMemo(() => {
    return defaultValue?.sinks
      ? defaultValue.sinks
      : ((defaultValue ?? []) as ExportPolicySinkFieldSchema[]);
  }, [defaultValue]);

  useEffect(() => {
    form.update({
      name: fields.sinks.name,
      value: values as ExportPolicySinkFieldSchema[],
    });
  }, [values]);

  const sourceNames = useMemo(() => {
    if (sourceFieldList.length > 0) {
      return sourceFieldList
        .map((source) => {
          const sourceField = source.getFieldset();
          return sourceField.name.value;
        })
        .filter(Boolean) as string[];
    }
    return [];
  }, [sourceFieldList]);

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-4">
        {fieldList.map((field, index) => {
          const sinkFields = field.getFieldset();
          return (
            <div className="relative flex items-center gap-2 rounded-md border p-4" key={field.key}>
              <SinkField
                projectId={projectId}
                isEdit={isEdit}
                fields={
                  sinkFields as unknown as ReturnType<
                    typeof useForm<ExportPolicySinkFieldSchema>
                  >[1]
                }
                defaultValue={values?.[index] as ExportPolicySinkFieldSchema}
                sourceList={
                  typeof sourceList !== 'undefined'
                    ? sourceList.map((source) => source.name)
                    : sourceNames
                }
              />
              {fieldList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn('text-destructive relative top-2 w-fit')}
                  onClick={() => form.remove({ name: fields.sinks.name, index })}>
                  <TrashIcon className="size-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() =>
          form.insert({
            name: fields.sinks.name,
            defaultValue: {
              name: '',
              type: ExportPolicySinkType.PROMETHEUS,
              sources: [],
            },
          })
        }>
        <PlusIcon className="size-4" />
        Add Sink
      </Button>
    </div>
  );
};
