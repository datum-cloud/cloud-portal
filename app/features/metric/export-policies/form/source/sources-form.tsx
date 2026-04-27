import { SourceField } from './source-field';
import { ExportPolicySourceTypeEnum } from '@/resources/export-policies';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { cn } from '@datum-cloud/datum-ui/utils';
import { PlusIcon, TrashIcon } from 'lucide-react';

export const SourcesForm = ({ isEdit = false }: { isEdit?: boolean }) => {
  return (
    <Form.FieldArray name="sources">
      {({ fields, append, remove }) => (
        <div className="flex flex-col gap-2">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                className="relative flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-center"
                key={field.key}>
                <SourceField isEdit={isEdit} isMultiple={fields.length > 1} index={index} />
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
                type: ExportPolicySourceTypeEnum.METRICS,
                metricQuery: '{}',
              })
            }>
            <PlusIcon className="size-4" />
            Add Source
          </Button>
        </div>
      )}
    </Form.FieldArray>
  );
};
