import { Field } from '@/components/field/field'
import { FieldLabel } from '@/components/field/field-label'
import { Input } from '@/components/ui/input'
import { InputWithAddons } from '@/components/ui/input-with-addons'
import { ExportPolicySinkPrometheusFieldSchema } from '@/resources/schemas/export-policy.schema'
import { getInputProps, useForm, useInputControl } from '@conform-to/react'
import { useEffect } from 'react'

export const BatchField = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<ExportPolicySinkPrometheusFieldSchema['batch']>>[1]
  defaultValues?: ExportPolicySinkPrometheusFieldSchema['batch']
}) => {
  const maxSizeControl = useInputControl(fields.maxSize)
  const timeoutControl = useInputControl(fields.timeout)

  useEffect(() => {
    if (defaultValues) {
      if (defaultValues.maxSize && !fields.maxSize.value) {
        maxSizeControl.change(String(defaultValues.maxSize))
      }
      if (defaultValues.timeout && !fields.timeout.value) {
        timeoutControl.change(String(defaultValues.timeout))
      }
    }
  }, [
    defaultValues,
    maxSizeControl,
    fields.maxSize.value,
    timeoutControl,
    fields.timeout.value,
  ])

  return (
    <div className="flex w-full flex-col gap-2">
      <FieldLabel label="Batch Configuration" />
      <div className="flex w-full gap-4">
        <Field
          isRequired
          label="Max Size"
          errors={fields.maxSize.errors}
          className="w-1/2">
          <Input
            {...getInputProps(fields.maxSize, { type: 'number' })}
            key={fields.maxSize.id}
            placeholder="e.g. 100"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              maxSizeControl.change(value)
            }}
          />
        </Field>
        <Field
          isRequired
          label="Timeout"
          errors={fields.timeout.errors}
          className="w-1/2">
          <InputWithAddons
            {...getInputProps(fields.timeout, { type: 'number' })}
            key={fields.timeout.id}
            placeholder="e.g. 5s"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              timeoutControl.change(value)
            }}
            trailing={<span className="text-muted-foreground">s</span>}
          />
        </Field>
      </div>
    </div>
  )
}
