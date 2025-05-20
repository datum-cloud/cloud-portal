import { Field } from '@/components/field/field'
import { Input } from '@/components/ui/input'
import { SelectIATA } from '@/features/location/form/select-iata'
import { PlacementFieldSchema } from '@/resources/schemas/workload.schema'
import { useForm, useInputControl, getInputProps } from '@conform-to/react'
import { useEffect, useRef } from 'react'
import { useHydrated } from 'remix-utils/use-hydrated'

export const PlacementField = ({
  isEdit = false,
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<PlacementFieldSchema>>[1]
  defaultValue?: PlacementFieldSchema
  isEdit?: boolean
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()

  const nameControl = useInputControl(fields.name)
  const cityCodeControl = useInputControl(fields.cityCode)
  const minimumReplicasControl = useInputControl(fields.minimumReplicas)

  useEffect(() => {
    if (defaultValue) {
      // Only set values if they exist in defaultValue and current fields are empty
      if (defaultValue.name && fields.name.value === '') {
        nameControl.change(defaultValue?.name)
      }

      if (defaultValue.cityCode && fields.cityCode.value === '') {
        cityCodeControl.change(defaultValue?.cityCode)
      }

      if (defaultValue.minimumReplicas && !fields.minimumReplicas.value) {
        minimumReplicasControl.change(defaultValue?.minimumReplicas.toString() ?? '1')
      }
    }
  }, [
    defaultValue,
    nameControl,
    cityCodeControl,
    minimumReplicasControl,
    fields.name.value,
    fields.cityCode.value,
    fields.minimumReplicas.value,
  ])

  // Focus the input when the form is hydrated
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <Field isRequired label="Name" errors={fields.name.errors} className="w-full">
        <Input
          {...getInputProps(fields.name, { type: 'text' })}
          ref={isEdit ? undefined : inputRef}
          key={fields.name.id}
          placeholder="e.g. my-placement-us-3sd122"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value
            nameControl.change(value)
          }}
        />
      </Field>

      <div className="flex w-full gap-2">
        <Field isRequired label="City" errors={fields.cityCode.errors} className="w-1/2">
          <SelectIATA
            name={fields.cityCode.name}
            id={fields.cityCode.id}
            placeholder="Select a city"
            defaultValue={fields.cityCode.value}
            onValueChange={(value) => {
              cityCodeControl.change(value.value)
            }}
          />
        </Field>
        <Field
          isRequired
          label="Min Replicas"
          errors={fields.minimumReplicas.errors}
          className="w-1/2">
          <Input
            {...getInputProps(fields.minimumReplicas, {
              type: 'number',
              min: 1,
            })}
            min={1}
            key={fields.minimumReplicas.id}
            placeholder="e.g. 1"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              minimumReplicasControl.change(value)
            }}
          />
        </Field>
      </div>
    </div>
  )
}
