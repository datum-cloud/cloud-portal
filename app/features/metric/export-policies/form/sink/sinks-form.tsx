import { SinkField } from './sink-field';
import { ExportPolicySinkTypeEnum } from '@/resources/export-policies';
import type { ExportPolicySourceFieldSchema } from '@/resources/export-policies';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { cn } from '@datum-cloud/datum-ui/utils';
import { PlusIcon, TrashIcon } from 'lucide-react';

export const SinksForm = ({
  isEdit = false,
  sourceList,
  projectId,
}: {
  isEdit?: boolean;
  sourceList?: ExportPolicySourceFieldSchema[];
  projectId?: string;
}) => {
  // Derive source names from the source list
  const sourceNames = (sourceList ?? []).map((source) => source.name).filter(Boolean) as string[];

  return (
    <Form.FieldArray name="sinks">
      {({ fields, append, remove }) => (
        <div className="flex flex-col gap-2">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                className="relative flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-center"
                key={field.key}>
                <SinkField
                  projectId={projectId}
                  isEdit={isEdit}
                  index={index}
                  sourceList={sourceNames}
                />
                {fields.length > 1 && (
                  <Button
                    htmlType="button"
                    type="quaternary"
                    theme="borderless"
                    size="small"
                    className={cn(
                      'text-destructive absolute top-2 right-2 w-fit sm:relative sm:top-auto sm:right-auto'
                    )}
                    onClick={() => remove(index)}>
                    <TrashIcon className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            htmlType="button"
            type="quaternary"
            theme="outline"
            size="small"
            className="w-fit"
            onClick={() =>
              append({
                name: '',
                type: ExportPolicySinkTypeEnum.PROMETHEUS,
                sources: [],
              })
            }>
            <PlusIcon className="size-4" />
            Add Sink
          </Button>
        </div>
      )}
    </Form.FieldArray>
  );
};
