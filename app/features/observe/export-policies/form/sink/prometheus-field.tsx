import { BatchField } from './batch-field'
import { RetryField } from './retry-field'
import { Field } from '@/components/field/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ExportPolicySinkPrometheusFieldSchema } from '@/resources/schemas/export-policy.schema'
import { getInputProps, useForm, useInputControl } from '@conform-to/react'
import { useEffect } from 'react'

export const PrometheusField = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<ExportPolicySinkPrometheusFieldSchema>>[1]
  defaultValues?: ExportPolicySinkPrometheusFieldSchema
}) => {
  const endpointUrlControl = useInputControl(fields.endpoint)

  useEffect(() => {
    if (defaultValues) {
      if (defaultValues.endpoint && !fields.endpoint.value) {
        endpointUrlControl.change(defaultValues.endpoint)
      }
    }
  }, [defaultValues, endpointUrlControl, fields.endpoint.value])

  return (
    <div className="flex w-full flex-col gap-2">
      <h3 className="text-sm font-medium">Prometheus Configuration</h3>
      <div className="flex w-full flex-col gap-4 rounded-md border p-4">
        <Field
          isRequired
          label="Endpoint URL"
          errors={fields.endpoint.errors}
          className="w-full">
          <Input
            {...getInputProps(fields.endpoint, { type: 'text' })}
            key={fields.endpoint.id}
            placeholder="e.g. http://localhost:9090"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              endpointUrlControl.change(value)
            }}
          />
        </Field>

        <Separator />

        {/* Batch Section */}
        <BatchField
          fields={
            fields.batch.getFieldset() as unknown as ReturnType<
              typeof useForm<ExportPolicySinkPrometheusFieldSchema['batch']>
            >[1]
          }
          defaultValues={
            defaultValues?.batch as ExportPolicySinkPrometheusFieldSchema['batch']
          }
        />

        <Separator />
        {/* Retry Section */}
        <RetryField
          fields={
            fields.retry.getFieldset() as unknown as ReturnType<
              typeof useForm<ExportPolicySinkPrometheusFieldSchema['retry']>
            >[1]
          }
          defaultValues={
            defaultValues?.retry as ExportPolicySinkPrometheusFieldSchema['retry']
          }
        />
      </div>
    </div>
  )
}
