import { KeyField } from './key-field'
import { FieldLabel } from '@/components/field/field-label'
import { Button } from '@/components/ui/button'
import { SecretEnvSchema, SecretVariablesSchema } from '@/resources/schemas/secret.schema'
import { cn } from '@/utils/misc'
import { FormMetadata, useForm } from '@conform-to/react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'

export const KeysForm = ({
  form,
  fields,
  defaultValue,
  mode = 'inline',
}: {
  form: FormMetadata<SecretVariablesSchema>
  fields: ReturnType<typeof useForm<SecretVariablesSchema>>[1]
  defaultValue?: SecretVariablesSchema
  mode?: 'inline' | 'dialog'
}) => {
  const variableList = fields.variables.getFieldList()

  const variableValue = useMemo(() => {
    return defaultValue?.variables
      ? defaultValue.variables
      : ((defaultValue ?? []) as SecretEnvSchema[])
  }, [defaultValue])

  useEffect(() => {
    if (variableValue && variableValue.length > 0) {
      form.update({
        name: fields.variables.name,
        value: variableValue as SecretEnvSchema[],
      })
    } else if (variableList.length === 0) {
      form.insert({
        name: fields.variables.name,
        defaultValue: {
          key: '',
          value: '',
        },
      })
    }
  }, [variableValue])

  return (
    <div className="flex flex-col gap-3">
      {mode === 'inline' && (
        <FieldLabel
          label="Key-value pairs"
          tooltipInfo="If not already base64-encoded, values will be encoded automatically."
        />
      )}
      <div className="space-y-4">
        {variableList.map((field, index) => {
          const variableFields = field.getFieldset()

          return (
            <div
              className={cn(
                'relative flex items-center gap-2',
                mode === 'inline' && 'px-1',
              )}
              key={field.key}>
              <KeyField
                fields={
                  variableFields as unknown as ReturnType<
                    typeof useForm<SecretEnvSchema>
                  >[1]
                }
                defaultValue={variableValue?.[index]}
              />

              {variableList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn('text-destructive relative top-2 w-fit')}
                  onClick={() => form.remove({ name: fields.variables.name, index })}>
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
        className="ml-1 w-fit"
        onClick={() =>
          form.insert({
            name: fields.variables.name,
            defaultValue: {
              key: '',
              value: '',
            },
          })
        }>
        <PlusIcon className="size-4" />
        Add
      </Button>
    </div>
  )
}
