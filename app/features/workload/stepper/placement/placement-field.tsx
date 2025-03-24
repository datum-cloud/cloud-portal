import { Field } from '@/components/field/field'
import { Input } from '@/components/ui/input'
import { SelectIATA } from '@/features/location/form/select-iata'
import { PlacementFieldSchema } from '@/resources/schemas/workload.schema'
import { useForm, useInputControl, getInputProps } from '@conform-to/react'
import { useEffect } from 'react'

export const PlacementField = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<PlacementFieldSchema>>[1]
  defaultValues?: PlacementFieldSchema
}) => {
  const nameControl = useInputControl(fields.name)
  const cityCodeControl = useInputControl(fields.cityCode)
  const minimumReplicasControl = useInputControl(fields.minimumReplicas)
  useEffect(() => {
    if (defaultValues) {
      // Only set values if they exist in defaultValues and current fields are empty
      if (defaultValues.name && fields.name.value === '') {
        nameControl.change(defaultValues?.name)
      }

      if (defaultValues.cityCode && !fields.cityCode.value) {
        cityCodeControl.change(defaultValues?.cityCode)
      }

      if (defaultValues.minimumReplicas && !fields.minimumReplicas.value) {
        minimumReplicasControl.change(defaultValues?.minimumReplicas.toString() ?? '1')
      }
    }
  }, [
    defaultValues,
    nameControl,
    cityCodeControl,
    minimumReplicasControl,
    fields.name.value,
    fields.cityCode.value,
    fields.minimumReplicas.value,
  ])
  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <Field label="Name" errors={fields.name.errors} className="w-full">
        <Input
          {...getInputProps(fields.name, { type: 'text' })}
          key={fields.name.id}
          placeholder="e.g. my-placement-us-3sd122"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value
            nameControl.change(value)
          }}
        />
      </Field>

      <div className="flex w-full gap-2">
        <Field label="City" errors={fields.cityCode.errors} className="w-1/2">
          <SelectIATA
            placeholder="Select a city"
            defaultValue={fields.cityCode.value}
            onValueChange={(value) => {
              cityCodeControl.change(value.iata_code)
            }}
          />
        </Field>
        <Field
          label="Minimum Replicas"
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
