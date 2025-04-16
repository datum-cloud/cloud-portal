import { SinkField } from './sink-field'
import { Button } from '@/components/ui/button'
import { ExportPolicySinkType } from '@/resources/interfaces/policy.interface'
import {
  ExportPolicySinkFieldSchema,
  ExportPolicySinksSchema,
  ExportPolicySourceFieldSchema,
} from '@/resources/schemas/export-policy.schema'
import { cn } from '@/utils/misc'
import { FormMetadata, useForm } from '@conform-to/react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useMemo, useEffect } from 'react'

export const SinksForm = ({
  form,
  fields,
  defaultValues,
  isEdit = false,
  sourcesList = [],
}: {
  form: FormMetadata<ExportPolicySinksSchema>
  fields: ReturnType<typeof useForm<ExportPolicySinksSchema>>[1]
  defaultValues?: ExportPolicySinksSchema
  isEdit?: boolean
  sourcesList: ExportPolicySourceFieldSchema[]
}) => {
  const fieldList = fields.sinks.getFieldList()
  const values = useMemo(() => {
    return defaultValues?.sinks
      ? defaultValues.sinks
      : ((defaultValues ?? []) as ExportPolicySinkFieldSchema[])
  }, [defaultValues])

  useEffect(() => {
    form.update({
      name: fields.sinks.name,
      value: values as ExportPolicySinkFieldSchema[],
    })
  }, [values])

  return (
    <div className="flex flex-col gap-2">
      <div className="space-y-4">
        {fieldList.map((field, index) => {
          const sinkFields = field.getFieldset()
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={field.key}>
              <SinkField
                isEdit={isEdit}
                fields={
                  sinkFields as unknown as ReturnType<
                    typeof useForm<ExportPolicySinkFieldSchema>
                  >[1]
                }
                defaultValues={values?.[index] as ExportPolicySinkFieldSchema}
                sourcesList={sourcesList}
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
  )
}
