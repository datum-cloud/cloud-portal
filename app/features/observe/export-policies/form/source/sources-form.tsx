import { SourceField } from './source-field'
import { Button } from '@/components/ui/button'
import { ExportPolicySourceType } from '@/resources/interfaces/policy.interface'
import {
  ExportPolicySourceFieldSchema,
  ExportPolicySourcesSchema,
} from '@/resources/schemas/export-policy.schema'
import { cn } from '@/utils/misc'
import { FormMetadata, useForm } from '@conform-to/react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useMemo, useEffect } from 'react'

export const SourcesForm = ({
  form,
  fields,
  defaultValues,
  isEdit = false,
}: {
  form: FormMetadata<ExportPolicySourcesSchema>
  fields: ReturnType<typeof useForm<ExportPolicySourcesSchema>>[1]
  defaultValues?: ExportPolicySourcesSchema
  isEdit?: boolean
}) => {
  const fieldList = fields.sources.getFieldList()
  const values = useMemo(() => {
    return defaultValues?.sources
      ? defaultValues.sources
      : ((defaultValues ?? []) as ExportPolicySourceFieldSchema[])
  }, [defaultValues])

  useEffect(() => {
    form.update({
      name: fields.sources.name,
      value: values as ExportPolicySourceFieldSchema[],
    })
  }, [values])

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-4">
        {fieldList.map((field, index) => {
          const sourceFields = field.getFieldset()
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={field.key}>
              <SourceField
                isEdit={isEdit}
                isMultiple={fieldList.length > 1}
                fields={
                  sourceFields as unknown as ReturnType<
                    typeof useForm<ExportPolicySourceFieldSchema>
                  >[1]
                }
                defaultValues={values?.[index] as ExportPolicySourceFieldSchema}
              />

              {fieldList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn('text-destructive relative top-2 w-fit')}
                  onClick={() => form.remove({ name: fields.sources.name, index })}>
                  <TrashIcon className="size-4" />
                </Button>
              )}
            </div>
          )
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() =>
          form.insert({
            name: fields.sources.name,
            defaultValue: {
              name: '',
              type: ExportPolicySourceType.METRICS,
              metricQuery: '{}',
            },
          })
        }>
        <PlusIcon className="size-4" />
        Add Source
      </Button>
    </div>
  )
}
