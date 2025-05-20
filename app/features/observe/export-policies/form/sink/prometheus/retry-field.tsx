import { Field } from '@/components/field/field'
import { FieldLabel } from '@/components/field/field-label'
import { Input } from '@/components/ui/input'
import { InputWithAddons } from '@/components/ui/input-with-addons'
import { ExportPolicySinkPrometheusFieldSchema } from '@/resources/schemas/export-policy.schema'
import { getInputProps, useForm, useInputControl } from '@conform-to/react'
import { useEffect } from 'react'

export const RetryField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<ExportPolicySinkPrometheusFieldSchema['retry']>>[1]
  defaultValue?: ExportPolicySinkPrometheusFieldSchema['retry']
}) => {
  const backoffDurationControl = useInputControl(fields.backoffDuration)
  const maxAttemptsControl = useInputControl(fields.maxAttempts)

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.backoffDuration && !fields.backoffDuration.value) {
        backoffDurationControl.change(String(defaultValue.backoffDuration))
      }
      if (defaultValue.maxAttempts && !fields.maxAttempts.value) {
        maxAttemptsControl.change(String(defaultValue.maxAttempts))
      }
    }
  }, [
    defaultValue,
    backoffDurationControl,
    fields.backoffDuration.value,
    maxAttemptsControl,
    fields.maxAttempts.value,
  ])

  return (
    <div className="flex w-full flex-col gap-2">
      <FieldLabel label="Retry Configuration" />
      <div className="flex w-full gap-2">
        <Field
          isRequired
          label="Max Attempts"
          errors={fields.maxAttempts.errors}
          className="w-1/2">
          <Input
            {...getInputProps(fields.maxAttempts, { type: 'number' })}
            key={fields.maxAttempts.id}
            placeholder="e.g. 1"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              maxAttemptsControl.change(value)
            }}
          />
        </Field>
        <Field
          isRequired
          label="Backoff Duration"
          errors={fields.backoffDuration.errors}
          className="w-1/2">
          <InputWithAddons
            {...getInputProps(fields.backoffDuration, { type: 'number' })}
            key={fields.backoffDuration.id}
            placeholder="e.g. 5s"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              backoffDurationControl.change(value)
            }}
            trailing={<span className="text-muted-foreground">s</span>}
          />
        </Field>
      </div>
    </div>
  )
}
